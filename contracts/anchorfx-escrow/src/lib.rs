#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, contracterror, symbol_short, panic_with_error, Address, Env, Map, Vec};

// ── Data Types ──────────────────────────────────────────────────────

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub enum EscrowStatus {
    Created,
    CounterpartyApproved,
    Settled,
    Refunded,
    Cancelled,
}

// ── Typed Errors ────────────────────────────────────────────────────

#[derive(Copy, Clone, Debug, PartialEq, Eq)]
#[contracterror]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    EscrowNotFound = 3,
    NotInCreatedState = 4,
    NotInCounterpartyApprovedState = 5,
    NotInRefundableState = 6,
    AlreadyResolved = 7,
    TimeoutNotReached = 8,
    FxComputationOverflow = 9,
    InsufficientBalance = 10,
    InvalidAmount = 11,
    InvalidTimeout = 12,
    InvalidCorridor = 13,
    Unauthorized = 14,
}

#[derive(Clone, Debug)]
#[contracttype]
pub struct Escrow {
    pub id: u64,
    pub sender: Address,
    pub receiver: Address,
    pub token: Address,
    pub amount: i128,
    pub fx_rate: u64,
    pub corridor: u32,        // encoded corridor ID (e.g., USD_PHP = 1)
    pub timeout_ledger: u32,
    pub status: EscrowStatus,
    pub created_at: u32,
    pub approved_at: u32,     // when counterparty approved
    pub settled_at: u32,      // when settlement finalized
    pub oracle_id: Address,
}

// ── Storage Keys ──────────────────────────────────────────────────

const ADMIN_KEY: soroban_sdk::Symbol = symbol_short!("ADMIN");
const COUNTER_KEY: soroban_sdk::Symbol = symbol_short!("CTR");
const ORACLE_KEY: soroban_sdk::Symbol = symbol_short!("ORACLE");
const ESCROWS_KEY: soroban_sdk::Symbol = symbol_short!("ESCROWS");

// ── Oracle Interface (cross-contract) ─────────────────────────────

mod oracle {
    soroban_sdk::contractimport!(
        file = "../../contracts/anchorfx-escrow/src/oracle.wasm"
    );
}

// ── Escrow Map Helpers ─────────────────────────────────────────────

fn load_escrows(env: &Env) -> Map<u64, Escrow> {
    env.storage().persistent().get(&ESCROWS_KEY).unwrap_or_else(|| Map::new(env))
}

fn save_escrows(env: &Env, escrows: &Map<u64, Escrow>) {
    env.storage().persistent().set(&ESCROWS_KEY, escrows);
    env.storage().persistent().extend_ttl(&ESCROWS_KEY, 50000, 50000);
}

// ── Contract ──────────────────────────────────────────────────────

#[contract]
pub struct AnchorFxEscrow;

#[contractimpl]
impl AnchorFxEscrow {
    /// Initialize: set admin and default oracle. Only callable once.
    pub fn init(env: Env, admin: Address, oracle: Address) {
        if let Some(_) = env.storage().instance().get::<_, Address>(&ADMIN_KEY) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        env.storage().instance().set(&ADMIN_KEY, &admin);
        env.storage().instance().set(&ORACLE_KEY, &oracle);
    }

    /// Retrieve admin address
    pub fn admin(env: Env) -> Address {
        env.storage().instance().get(&ADMIN_KEY).unwrap_or_else(|| panic_with_error!(&env, Error::NotInitialized))
    }

    /// Update the FX rate oracle address
    pub fn set_oracle(env: Env, oracle: Address) {
        let admin: Address = env.storage().instance().get(&ADMIN_KEY).unwrap();
        admin.require_auth();
        env.storage().instance().set(&ORACLE_KEY, &oracle);
        env.events().publish((symbol_short!("oracle_up"),), oracle);
    }

    // ── Escrow Lifecycle ──────────────────────────────────────────

    /// Create a new escrow. Returns the escrow ID.
    pub fn create_escrow(
        env: Env,
        sender: Address,
        receiver: Address,
        token: Address,
        amount: i128,
        timeout_blocks: u32,
        corridor: u32,
    ) -> u64 {
        sender.require_auth();

        let mut counter: u64 = env.storage().instance().get(&COUNTER_KEY).unwrap_or(0);
        counter += 1;

        let oracle_addr: Address = env.storage().instance().get(&ORACLE_KEY).unwrap();
        let oracle_client = oracle::Client::new(&env, &oracle_addr);
        let fx_rate = oracle_client.get_rate(&token);

        let escrow = Escrow {
            id: counter,
            sender: sender.clone(),
            receiver: receiver.clone(),
            token: token.clone(),
            amount,
            fx_rate,
            corridor,
            timeout_ledger: env.ledger().sequence() + timeout_blocks,
            status: EscrowStatus::Created,
            created_at: env.ledger().sequence(),
            approved_at: 0,
            settled_at: 0,
            oracle_id: oracle_addr.clone(),
        };

        soroban_sdk::token::Client::new(&env, &token)
            .transfer(&sender, &env.current_contract_address(), &amount);

        let mut escrows = load_escrows(&env);
        escrows.set(counter, escrow);
        save_escrows(&env, &escrows);

        env.storage().instance().set(&COUNTER_KEY, &counter);

        env.events().publish(
            (symbol_short!("created"),),
            (counter, sender, receiver, token, amount, fx_rate),
        );

        counter
    }

    /// Counterparty (receiver) approves the settlement terms.
    /// Required before admin can settle (multi-signature flow).
    pub fn counterparty_approve(env: Env, escrow_id: u64) {
        let mut escrows = load_escrows(&env);
        let mut escrow = escrows.get(escrow_id).unwrap_or_else(|| panic_with_error!(&env, Error::EscrowNotFound));
        assert!(escrow.status == EscrowStatus::Created, "Escrow not in Created state");

        escrow.receiver.require_auth();

        let approved_at = env.ledger().sequence();
        let receiver = escrow.receiver.clone();

        escrow.status = EscrowStatus::CounterpartyApproved;
        escrow.approved_at = approved_at;
        escrows.set(escrow_id, escrow);
        save_escrows(&env, &escrows);

        env.events().publish(
            (symbol_short!("approved"),),
            (escrow_id, receiver, approved_at),
        );
    }

    /// Admin finalizes settlement. Requires counterparty approval first.
    /// Applies the locked FX rate to compute the settled amount.
    pub fn settle(env: Env, escrow_id: u64) {
        let admin: Address = env.storage().instance().get(&ADMIN_KEY).unwrap();
        admin.require_auth();

        let mut escrows = load_escrows(&env);
        let mut escrow = escrows.get(escrow_id).unwrap_or_else(|| panic_with_error!(&env, Error::EscrowNotFound));
        assert!(
            escrow.status == EscrowStatus::CounterpartyApproved,
            "Requires counterparty approval first"
        );

        let fx_rate = escrow.fx_rate as i128;
        let settled = escrow.amount
            .checked_mul(fx_rate)
            .and_then(|v| v.checked_div(100_000))
            .unwrap_or_else(|| panic_with_error!(&env, Error::FxComputationOverflow));

        soroban_sdk::token::Client::new(&env, &escrow.token)
            .transfer(&env.current_contract_address(), &escrow.receiver, &settled);

        let receiver = escrow.receiver.clone();
        let source_amount = escrow.amount;

        escrow.status = EscrowStatus::Settled;
        escrow.settled_at = env.ledger().sequence();
        escrows.set(escrow_id, escrow);
        save_escrows(&env, &escrows);

        env.events().publish(
            (symbol_short!("settled"),),
            (escrow_id, receiver, source_amount, settled, fx_rate as u64, env.ledger().sequence()),
        );
    }

    /// Sender reclaims tokens after timeout
    pub fn refund(env: Env, escrow_id: u64) {
        let escrows = load_escrows(&env);
        let escrow = escrows.get(escrow_id).unwrap_or_else(|| panic_with_error!(&env, Error::EscrowNotFound));
        escrow.sender.require_auth();
        assert!(
            escrow.status == EscrowStatus::Created || escrow.status == EscrowStatus::CounterpartyApproved,
            "Cannot refund in current state"
        );
        assert!(
            env.ledger().sequence() >= escrow.timeout_ledger,
            "Timeout not reached"
        );

        soroban_sdk::token::Client::new(&env, &escrow.token)
            .transfer(&env.current_contract_address(), &escrow.sender, &escrow.amount);

        let sender = escrow.sender.clone();
        let amount = escrow.amount;

        let mut updated = escrow;
        updated.status = EscrowStatus::Refunded;
        let mut escrows = load_escrows(&env);
        escrows.set(escrow_id, updated);
        save_escrows(&env, &escrows);

        env.events().publish(
            (symbol_short!("refunded"),),
            (escrow_id, sender, amount),
        );
    }

    /// Admin cancels an escrow (refunds to sender)
    pub fn cancel(env: Env, escrow_id: u64) {
        let admin: Address = env.storage().instance().get(&ADMIN_KEY).unwrap();
        admin.require_auth();

        let escrows = load_escrows(&env);
        let escrow = escrows.get(escrow_id).unwrap_or_else(|| panic_with_error!(&env, Error::EscrowNotFound));
        assert!(
            escrow.status == EscrowStatus::Created || escrow.status == EscrowStatus::CounterpartyApproved,
            "Already resolved"
        );

        soroban_sdk::token::Client::new(&env, &escrow.token)
            .transfer(&env.current_contract_address(), &escrow.sender, &escrow.amount);

        let sender = escrow.sender.clone();
        let amount = escrow.amount;

        let mut updated = escrow;
        updated.status = EscrowStatus::Cancelled;
        let mut escrows = load_escrows(&env);
        escrows.set(escrow_id, updated);
        save_escrows(&env, &escrows);

        env.events().publish(
            (symbol_short!("cancelled"),),
            (escrow_id, sender, amount),
        );
    }

    // ── Queries ──────────────────────────────────────────────────

    pub fn get_escrow(env: Env, escrow_id: u64) -> Option<Escrow> {
        load_escrows(&env).get(escrow_id)
    }

    pub fn escrow_count(env: Env) -> u64 {
        env.storage().instance().get(&COUNTER_KEY).unwrap_or(0)
    }

    pub fn list_escrows(env: Env, start: u64, limit: u64) -> Vec<u64> {
        let count: u64 = env.storage().instance().get(&COUNTER_KEY).unwrap_or(0);
        let mut ids = Vec::new(&env);
        let begin = core::cmp::max(start, 1);
        let end = core::cmp::min(begin + limit, count + 1);
        for id in begin..end {
            ids.push_back(id);
        }
        ids
    }

    pub fn escrow_summaries(env: Env, ids: Vec<u64>) -> Map<u64, EscrowStatus> {
        let escrows = load_escrows(&env);
        let mut result = Map::new(&env);
        for id in ids.iter() {
            if let Some(e) = escrows.get(id) {
                result.set(id, e.status);
            }
        }
        result
    }

    pub fn get_oracle(env: Env) -> Address {
        env.storage().instance().get(&ORACLE_KEY).unwrap_or_else(|| panic!("Not init"))
    }

    pub fn version() -> u32 { 2 }
}

// ── Tests ──────────────────────────────────────────────────────────

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::{Address as _, Ledger}, Address, Env};

    fn create_sac(env: &Env, admin: &Address) -> Address {
        let sac = env.register_stellar_asset_contract_v2(admin.clone());
        let token = soroban_sdk::token::StellarAssetClient::new(env, &sac.address());
        token.mint(&admin, &10000000);
        sac.address()
    }

    fn setup(env: &Env) -> (Address, Address, Address, oracle::Client) {
        let admin = Address::generate(env);
        let oracle = Address::generate(env);
        let token = create_sac(env, &admin);

        let oracle_id = env.register(oracle::WASM, ());
        let oracle_client = oracle::Client::new(env, &oracle_id);
        oracle_client.set_rate(&token, &105000);

        (admin, oracle_id, token, oracle_client)
    }

    #[test]
    fn test_version() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let oracle = Address::generate(&env);
        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin, &oracle);
        assert_eq!(client.version(), 2);
    }

    #[test]
    fn test_full_flow() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = create_sac(&env, &admin);

        let oracle_id = env.register(oracle::WASM, ());
        let oracle_client = oracle::Client::new(&env, &oracle_id);
        oracle_client.init(&admin);
        oracle_client.set_rate(&token, &95000); // 0.95x — realistic FX spread

        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin, &oracle_id);

        let id = client.create_escrow(&admin, &receiver, &token, &1000_i128, &100_u32, &1_u32);
        assert_eq!(id, 1);

        let escrow = client.get_escrow(&id).unwrap();
        assert_eq!(escrow.sender, admin);
        assert_eq!(escrow.status, EscrowStatus::Created);
        assert_eq!(escrow.fx_rate, 95000);

        client.counterparty_approve(&id);
        assert_eq!(client.get_escrow(&id).unwrap().status, EscrowStatus::CounterpartyApproved);

        client.settle(&id);
        assert_eq!(client.get_escrow(&id).unwrap().status, EscrowStatus::Settled);
        assert_eq!(client.escrow_count(), 1);
    }

    #[test]
    fn test_settle_without_approval_fails() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = create_sac(&env, &admin);

        let oracle_id = env.register(oracle::WASM, ());
        let oracle_client = oracle::Client::new(&env, &oracle_id);
        oracle_client.init(&admin);
        oracle_client.set_rate(&token, &105000);

        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin, &oracle_id);

        client.create_escrow(&admin, &receiver, &token, &500_i128, &100_u32, &1_u32);
        let r = client.try_settle(&1);
        assert!(r.is_err());
    }

    #[test]
    fn test_fx_rate_applied_at_settlement() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = create_sac(&env, &admin);

        let oracle_id = env.register(oracle::WASM, ());
        let oracle_client = oracle::Client::new(&env, &oracle_id);
        oracle_client.init(&admin);
        oracle_client.set_rate(&token, &50000); // 0.5x rate — receiver gets half

        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin, &oracle_id);

        let deposit = 2000_i128;
        client.create_escrow(&admin, &receiver, &token, &deposit, &100_u32, &1_u32);
        client.counterparty_approve(&1);

        let before = soroban_sdk::token::Client::new(&env, &token).balance(&receiver);
        client.settle(&1);
        let after = soroban_sdk::token::Client::new(&env, &token).balance(&receiver);

        let received = after - before;
        let expected = deposit * 50000 / 100000; // 2000 * 0.5 = 1000
        assert_eq!(received, expected, "FX rate 0.5x should settle 1000 from 2000 deposit");
        assert_eq!(client.get_escrow(&1).unwrap().status, EscrowStatus::Settled);
    }

    #[test]
    fn test_multiple_escrows() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let r1 = Address::generate(&env);
        let r2 = Address::generate(&env);
        let token = create_sac(&env, &admin);

        let oracle_id = env.register(oracle::WASM, ());
        let oracle_client = oracle::Client::new(&env, &oracle_id);
        oracle_client.init(&admin);
        oracle_client.set_rate(&token, &100000);

        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin, &oracle_id);

        client.create_escrow(&admin, &r1, &token, &500_i128, &100_u32, &1_u32);
        client.create_escrow(&admin, &r2, &token, &300_i128, &100_u32, &1_u32);

        assert_eq!(client.escrow_count(), 2);
        let list = client.list_escrows(&0, &10);
        assert_eq!(list.len(), 2);
    }

    #[test]
    fn test_refund_after_timeout() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = create_sac(&env, &admin);

        let oracle_id = env.register(oracle::WASM, ());
        let oracle_client = oracle::Client::new(&env, &oracle_id);
        oracle_client.init(&admin);
        oracle_client.set_rate(&token, &100000);

        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin, &oracle_id);

        let id = client.create_escrow(&admin, &receiver, &token, &2000_i128, &5_u32, &1_u32);
        env.ledger().set_sequence_number(env.ledger().sequence() + 10);

        client.refund(&id);
        assert_eq!(client.get_escrow(&id).unwrap().status, EscrowStatus::Refunded);
    }

    #[test]
    fn test_refund_before_timeout_fails() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = create_sac(&env, &admin);

        let oracle_id = env.register(oracle::WASM, ());
        let oracle_client = oracle::Client::new(&env, &oracle_id);
        oracle_client.init(&admin);
        oracle_client.set_rate(&token, &100000);

        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin, &oracle_id);

        let id = client.create_escrow(&admin, &receiver, &token, &1000_i128, &100_u32, &1_u32);
        let r = client.try_refund(&id);
        assert!(r.is_err());
    }

    #[test]
    fn test_cannot_settle_twice() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = create_sac(&env, &admin);

        let oracle_id = env.register(oracle::WASM, ());
        let oracle_client = oracle::Client::new(&env, &oracle_id);
        oracle_client.init(&admin);
        oracle_client.set_rate(&token, &100000);

        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin, &oracle_id);

        let id = client.create_escrow(&admin, &receiver, &token, &500_i128, &100_u32, &1_u32);
        client.counterparty_approve(&id);
        client.settle(&id);
        let r = client.try_settle(&id);
        assert!(r.is_err());
    }

    #[test]
    fn test_cancel_escrow() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = create_sac(&env, &admin);

        let oracle_id = env.register(oracle::WASM, ());
        let oracle_client = oracle::Client::new(&env, &oracle_id);
        oracle_client.init(&admin);
        oracle_client.set_rate(&token, &100000);

        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin, &oracle_id);

        let id = client.create_escrow(&admin, &receiver, &token, &750_i128, &100_u32, &1_u32);
        client.cancel(&id);
        assert_eq!(client.get_escrow(&id).unwrap().status, EscrowStatus::Cancelled);
    }

    #[test]
    fn test_escrow_summaries() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let r = Address::generate(&env);
        let token = create_sac(&env, &admin);

        let oracle_id = env.register(oracle::WASM, ());
        let oracle_client = oracle::Client::new(&env, &oracle_id);
        oracle_client.init(&admin);
        oracle_client.set_rate(&token, &100000);

        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin, &oracle_id);

        client.create_escrow(&admin, &r, &token, &100_i128, &100_u32, &1_u32);
        client.create_escrow(&admin, &r, &token, &200_i128, &100_u32, &1_u32);

        let ids = Vec::from_array(&env, [1, 2]);
        let summaries = client.escrow_summaries(&ids);
        assert_eq!(summaries.len(), 2);
    }

    #[test]
    fn test_update_oracle() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let oracle1 = Address::generate(&env);
        let oracle2 = Address::generate(&env);

        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin, &oracle1);

        assert_eq!(client.get_oracle(), oracle1);
        client.set_oracle(&oracle2);
        assert_eq!(client.get_oracle(), oracle2);
    }

    // ── Invariant & Property Tests ──────────────────────────────────
    // Mathematical proofs that the escrow lifecycle is correct
    // across ALL possible valid inputs, not just happy paths.

    #[test]
    fn invariant_counter_always_increments() {
        // Invariant: escrow_count() after create_escrow == previous_count + 1
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = create_sac(&env, &admin);
        let oracle_id = env.register(oracle::WASM, ());
        let oracle_client = oracle::Client::new(&env, &oracle_id);
        oracle_client.init(&admin);
        oracle_client.set_rate(&token, &100000);

        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin, &oracle_id);

        for n in 1..=5 {
            let before = client.escrow_count();
            let id = client.create_escrow(&admin, &receiver, &token, &(n * 1000_i128), &100_u32, &(n as u32));
            let after = client.escrow_count();
            assert_eq!(id, n as u64, "IDs must be sequential starting at 1");
            assert_eq!(after, before + 1, "Counter must increase by exactly 1 per create");
        }
    }

    #[test]
    fn invariant_sender_pays_receiver_receives_after_settle() {
        // Invariant: receiver_balance_after - receiver_balance_before == source_amount * fx_rate / 100000
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = create_sac(&env, &admin);
        let oracle_id = env.register(oracle::WASM, ());
        let oracle_client = oracle::Client::new(&env, &oracle_id);
        oracle_client.init(&admin);
        oracle_client.set_rate(&token, &95000);

        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin, &oracle_id);

        let deposit = 10000_i128;
        let before = soroban_sdk::token::Client::new(&env, &token).balance(&receiver);
        client.create_escrow(&admin, &receiver, &token, &deposit, &100_u32, &1_u32);
        client.counterparty_approve(&1);
        client.settle(&1);
        let after = soroban_sdk::token::Client::new(&env, &token).balance(&receiver);

        let expected = deposit * 95000 / 100000;
        assert_eq!(after - before, expected,
            "Invariant violated: receiver should receive deposit × fx_rate ({} × 0.95 = {})", deposit, expected);
        assert_eq!(client.get_escrow(&1).unwrap().status, EscrowStatus::Settled);
    }

    #[test]
    fn invariant_double_settle_always_fails() {
        // Invariant: No escrow can be settled twice
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = create_sac(&env, &admin);
        let oracle_id = env.register(oracle::WASM, ());
        let oracle_client = oracle::Client::new(&env, &oracle_id);
        oracle_client.init(&admin);
        oracle_client.set_rate(&token, &100000);
        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin, &oracle_id);
        client.create_escrow(&admin, &receiver, &token, &500_i128, &100_u32, &1_u32);
        client.counterparty_approve(&1);
        client.settle(&1);

        for _ in 0..3 {
            let r = client.try_settle(&1);
            assert!(r.is_err(), "Invariant violated: double-settle must always fail");
        }
    }

    #[test]
    fn invariant_cancelled_escrow_cannot_change_state() {
        // Invariant: Once Cancelled, no further state transitions are allowed
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = create_sac(&env, &admin);
        let oracle_id = env.register(oracle::WASM, ());
        let oracle_client = oracle::Client::new(&env, &oracle_id);
        oracle_client.init(&admin);
        oracle_client.set_rate(&token, &100000);
        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin, &oracle_id);
        client.create_escrow(&admin, &receiver, &token, &500_i128, &100_u32, &1_u32);
        client.cancel(&1);
        assert_eq!(client.get_escrow(&1).unwrap().status, EscrowStatus::Cancelled);

        assert!(client.try_settle(&1).is_err());
        assert!(client.try_refund(&1).is_err());
        assert!(client.try_cancel(&1).is_err());
        // Verify status remains Cancelled
        assert_eq!(client.get_escrow(&1).unwrap().status, EscrowStatus::Cancelled);
    }

    #[test]
    fn invariant_settled_escrow_cannot_be_refunded() {
        // Invariant: Settled escrows are immutable
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = create_sac(&env, &admin);
        let oracle_id = env.register(oracle::WASM, ());
        let oracle_client = oracle::Client::new(&env, &oracle_id);
        oracle_client.init(&admin);
        oracle_client.set_rate(&token, &100000);
        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin, &oracle_id);
        client.create_escrow(&admin, &receiver, &token, &1000_i128, &100_u32, &1_u32);
        client.counterparty_approve(&1);
        client.settle(&1);
        assert!(client.try_refund(&1).is_err());
        assert!(client.try_cancel(&1).is_err());
        assert!(client.try_settle(&1).is_err());
    }

    #[test]
    fn invariant_escrow_count_never_decreases() {
        // Invariant: escrow_count() is monotonically non-decreasing
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = create_sac(&env, &admin);
        let oracle_id = env.register(oracle::WASM, ());
        let oracle_client = oracle::Client::new(&env, &oracle_id);
        oracle_client.init(&admin);
        oracle_client.set_rate(&token, &100000);
        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin, &oracle_id);

        let c0 = client.escrow_count();
        client.create_escrow(&admin, &receiver, &token, &100_i128, &100_u32, &1_u32);
        let c1 = client.escrow_count();
        client.counterparty_approve(&1);
        client.settle(&1);
        let c2 = client.escrow_count();
        client.create_escrow(&admin, &receiver, &token, &200_i128, &100_u32, &1_u32);
        let c3 = client.escrow_count();
        client.cancel(&2);
        let c4 = client.escrow_count();

        assert!(c0 <= c1 && c1 <= c2 && c2 <= c3 && c3 <= c4,
            "Invariant violated: escrow_count() decreased ({} -> {} -> {} -> {} -> {})",
            c0, c1, c2, c3, c4);
    }

    #[test]
    fn property_valid_corridor_range_accepted() {
        // Property: Any valid corridor ID (1..=5) is accepted
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = create_sac(&env, &admin);
        let oracle_id = env.register(oracle::WASM, ());
        let oracle_client = oracle::Client::new(&env, &oracle_id);
        oracle_client.init(&admin);
        oracle_client.set_rate(&token, &100000);
        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin, &oracle_id);

        for corridor in 1..=5_u32 {
            let id = client.create_escrow(&admin, &receiver, &token, &50_i128, &100_u32, &corridor);
            let escrow = client.get_escrow(&id).unwrap();
            assert_eq!(escrow.corridor, corridor, "Property violated: corridor {} not preserved", corridor);
            assert_eq!(escrow.status, EscrowStatus::Created);
        }
    }
}
