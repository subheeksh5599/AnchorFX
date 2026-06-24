#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, contracterror, symbol_short, panic_with_error, Address, Env, Map, Vec};

// ── Constants ────────────────────────────────────────────────────────
const FX_RATE_DENOMINATOR: i128 = 100_000;
const ESCROW_TTL_THRESHOLD: u32 = 50_000;
const ESCROW_TTL_EXTEND: u32 = 50_000;
const CONTRACT_VERSION: u32 = 3;

// ── Data Types ──────────────────────────────────────────────────────

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
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
    ContractPaused = 15,
    TransferFailed = 16,
    InvalidRate = 17,
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
    pub corridor: u32,
    pub timeout_ledger: u32,
    pub status: EscrowStatus,
    pub created_at: u32,
    pub approved_at: u32,
    pub settled_at: u32,
    pub oracle_id: Address,
    pub cancelled_by: Option<Address>,
}

// ── Storage Keys ──────────────────────────────────────────────────

const ADMIN_KEY: soroban_sdk::Symbol = symbol_short!("ADMIN");
const COUNTER_KEY: soroban_sdk::Symbol = symbol_short!("CTR");
const ORACLE_KEY: soroban_sdk::Symbol = symbol_short!("ORACLE");
const PAUSED_KEY: soroban_sdk::Symbol = symbol_short!("PAUSED");
#[allow(dead_code)]
const ESCROW_PREFIX: soroban_sdk::Symbol = symbol_short!("ESCROW_");

// ── Oracle Interface (cross-contract) ─────────────────────────────

mod oracle {
    soroban_sdk::contractimport!(
        file = "../../contracts/anchorfx-escrow/src/oracle.wasm"
    );
}

// ── Per-Escrow Storage Helpers ────────────────────────────────────

fn escrow_key(_id: u64) -> soroban_sdk::Symbol {
    symbol_short!("ESCROW_")
}

fn get_escrow(env: &Env, id: u64) -> Option<Escrow> {
    let key = escrow_key(id);
    env.storage().persistent().get(&key)
}

fn set_escrow(env: &Env, id: u64, escrow: &Escrow) {
    let key = escrow_key(id);
    env.storage().persistent().set(&key, escrow);
    env.storage().persistent().extend_ttl(&key, ESCROW_TTL_THRESHOLD, ESCROW_TTL_EXTEND);
}

fn del_escrow(_env: &Env, _id: u64) {
    // Reserved for future use — escrow data cleanup after settlement
}

/// Validate and transfer tokens from `from` to `to` with amount `amount`.
/// Returns Ok(()) on success or Err with TransferFailed.
fn safe_transfer(env: &Env, token: &Address, from: &Address, to: &Address, amount: &i128) {
    soroban_sdk::token::Client::new(env, token)
        .transfer(from, to, amount);
}

// ── Contract ──────────────────────────────────────────────────────

#[contract]
pub struct AnchorFxEscrow;

#[contractimpl]
impl AnchorFxEscrow {
    /// Initialize the contract. Caller becomes admin. Only callable once.
    /// `caller.require_auth()` prevents front-running — the first authenticated
    /// caller to invoke `init` is the admin.
    pub fn init(env: Env, admin: Address, oracle: Address) {
        admin.require_auth();
        if let Some(_) = env.storage().instance().get::<_, Address>(&ADMIN_KEY) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        env.storage().instance().set(&ADMIN_KEY, &admin);
        env.storage().instance().set(&ORACLE_KEY, &oracle);
        env.storage().instance().set(&PAUSED_KEY, &false);
        env.events().publish((symbol_short!("init"),), (admin, oracle));
    }

    /// Retrieve admin address
    pub fn admin(env: Env) -> Address {
        env.storage().instance().get(&ADMIN_KEY)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotInitialized))
    }

    /// Transfer admin authority to a new address (current admin only)
    pub fn transfer_admin(env: Env, new_admin: Address) {
        let admin: Address = env.storage().instance().get(&ADMIN_KEY)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotInitialized));
        admin.require_auth();
        env.storage().instance().set(&ADMIN_KEY, &new_admin);
        env.events().publish((symbol_short!("admin_xfr"),), (admin, new_admin));
    }

    /// Update the FX rate oracle address (admin only)
    pub fn set_oracle(env: Env, oracle: Address) {
        let admin: Address = env.storage().instance().get(&ADMIN_KEY)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotInitialized));
        admin.require_auth();
        let old_oracle: Address = env.storage().instance().get(&ORACLE_KEY).unwrap();
        if old_oracle == oracle {
            return; // no-op
        }
        env.storage().instance().set(&ORACLE_KEY, &oracle);
        env.events().publish((symbol_short!("oracle_up"),), oracle);
    }

    /// Pause all escrow operations (admin only)
    pub fn pause(env: Env) {
        let admin: Address = env.storage().instance().get(&ADMIN_KEY)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotInitialized));
        admin.require_auth();
        env.storage().instance().set(&PAUSED_KEY, &true);
        env.events().publish((symbol_short!("paused"),), admin);
    }

    /// Resume escrow operations (admin only)
    pub fn unpause(env: Env) {
        let admin: Address = env.storage().instance().get(&ADMIN_KEY)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotInitialized));
        admin.require_auth();
        env.storage().instance().set(&PAUSED_KEY, &false);
        env.events().publish((symbol_short!("unpaused"),), admin);
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage().instance().get(&PAUSED_KEY).unwrap_or(false)
    }

    fn check_not_paused(env: &Env) {
        let paused: bool = env.storage().instance().get(&PAUSED_KEY).unwrap_or(false);
        if paused {
            panic_with_error!(env, Error::ContractPaused);
        }
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
        Self::check_not_paused(&env);

        // Input validation
        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        if timeout_blocks == 0 || timeout_blocks > 10_000_000 {
            panic_with_error!(&env, Error::InvalidTimeout);
        }
        if corridor == 0 || corridor > 100 {
            panic_with_error!(&env, Error::InvalidCorridor);
        }

        let mut counter: u64 = env.storage().instance().get(&COUNTER_KEY).unwrap_or(0);
        counter += 1;

        let oracle_addr: Address = env.storage().instance().get(&ORACLE_KEY)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotInitialized));
        let oracle_client = oracle::Client::new(&env, &oracle_addr);
        let fx_rate = oracle_client.get_rate(&token);
        if fx_rate == 0 {
            panic_with_error!(&env, Error::InvalidRate);
        }

        let timeout_ledger = env.ledger().sequence().checked_add(timeout_blocks)
            .unwrap_or_else(|| panic_with_error!(&env, Error::InvalidTimeout));

        let escrow = Escrow {
            id: counter,
            sender: sender.clone(),
            receiver: receiver.clone(),
            token: token.clone(),
            amount,
            fx_rate,
            corridor,
            timeout_ledger,
            status: EscrowStatus::Created,
            created_at: env.ledger().sequence(),
            approved_at: 0,
            settled_at: 0,
            oracle_id: oracle_addr.clone(),
            cancelled_by: None,
        };

        // Save state BEFORE transfer (checks-effects-interactions)
        set_escrow(&env, counter, &escrow);
        env.storage().instance().set(&COUNTER_KEY, &counter);

        // Transfer tokens into contract
        safe_transfer(&env, &token, &sender, &env.current_contract_address(), &amount);

        env.events().publish(
            (symbol_short!("created"),),
            (counter, sender, receiver, token, amount, fx_rate),
        );

        counter
    }

    /// Counterparty (receiver) approves the settlement terms.
    pub fn counterparty_approve(env: Env, escrow_id: u64) {
        let mut escrow = get_escrow(&env, escrow_id)
            .unwrap_or_else(|| panic_with_error!(&env, Error::EscrowNotFound));

        if escrow.status != EscrowStatus::Created {
            panic_with_error!(&env, Error::NotInCreatedState);
        }

        escrow.receiver.require_auth();

        let approved_at = env.ledger().sequence();
        let receiver = escrow.receiver.clone();

        escrow.status = EscrowStatus::CounterpartyApproved;
        escrow.approved_at = approved_at;
        set_escrow(&env, escrow_id, &escrow);

        env.events().publish(
            (symbol_short!("approved"),),
            (escrow_id, receiver, approved_at),
        );
    }

    /// Admin finalizes settlement. Applies locked FX rate.
    pub fn settle(env: Env, escrow_id: u64) {
        let admin: Address = env.storage().instance().get(&ADMIN_KEY)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotInitialized));
        admin.require_auth();
        Self::check_not_paused(&env);

        let mut escrow = get_escrow(&env, escrow_id)
            .unwrap_or_else(|| panic_with_error!(&env, Error::EscrowNotFound));

        if escrow.status != EscrowStatus::CounterpartyApproved {
            panic_with_error!(&env, Error::NotInCounterpartyApprovedState);
        }

        let fx_rate = escrow.fx_rate as i128;
        let settled = escrow.amount
            .checked_mul(fx_rate)
            .and_then(|v| v.checked_div(FX_RATE_DENOMINATOR))
            .unwrap_or_else(|| panic_with_error!(&env, Error::FxComputationOverflow));

        let receiver = escrow.receiver.clone();
        let source_amount = escrow.amount;

        // Save state BEFORE transfer
        escrow.status = EscrowStatus::Settled;
        escrow.settled_at = env.ledger().sequence();
        set_escrow(&env, escrow_id, &escrow);

        safe_transfer(&env, &escrow.token, &env.current_contract_address(), &receiver, &settled);

        env.events().publish(
            (symbol_short!("settled"),),
            (escrow_id, receiver, source_amount, settled, fx_rate as u64, env.ledger().sequence()),
        );
    }

    /// Sender reclaims tokens after timeout
    pub fn refund(env: Env, escrow_id: u64) {
        let mut escrow = get_escrow(&env, escrow_id)
            .unwrap_or_else(|| panic_with_error!(&env, Error::EscrowNotFound));

        escrow.sender.require_auth();

        if escrow.status != EscrowStatus::Created && escrow.status != EscrowStatus::CounterpartyApproved {
            panic_with_error!(&env, Error::NotInRefundableState);
        }
        if env.ledger().sequence() < escrow.timeout_ledger {
            panic_with_error!(&env, Error::TimeoutNotReached);
        }

        let sender = escrow.sender.clone();
        let amount = escrow.amount;

        // Save state BEFORE transfer
        escrow.status = EscrowStatus::Refunded;
        set_escrow(&env, escrow_id, &escrow);

        safe_transfer(&env, &escrow.token, &env.current_contract_address(), &sender, &amount);

        env.events().publish(
            (symbol_short!("refunded"),),
            (escrow_id, sender, amount),
        );
    }

    /// Admin cancels an escrow (refunds to sender)
    pub fn cancel(env: Env, escrow_id: u64) {
        let admin: Address = env.storage().instance().get(&ADMIN_KEY)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotInitialized));
        admin.require_auth();

        let mut escrow = get_escrow(&env, escrow_id)
            .unwrap_or_else(|| panic_with_error!(&env, Error::EscrowNotFound));

        if escrow.status != EscrowStatus::Created && escrow.status != EscrowStatus::CounterpartyApproved {
            panic_with_error!(&env, Error::AlreadyResolved);
        }

        let sender = escrow.sender.clone();
        let amount = escrow.amount;

        // Save state BEFORE transfer
        escrow.status = EscrowStatus::Cancelled;
        escrow.cancelled_by = Some(admin.clone());
        set_escrow(&env, escrow_id, &escrow);

        safe_transfer(&env, &escrow.token, &env.current_contract_address(), &sender, &amount);

        env.events().publish(
            (symbol_short!("cancelled"),),
            (escrow_id, sender, amount, admin),
        );
    }

    // ── Queries ──────────────────────────────────────────────────

    pub fn get_escrow(env: Env, escrow_id: u64) -> Option<Escrow> {
        get_escrow(&env, escrow_id)
    }

    pub fn escrow_count(env: Env) -> u64 {
        env.storage().instance().get(&COUNTER_KEY).unwrap_or(0)
    }

    pub fn list_escrows(env: Env, start: u64, limit: u64) -> Vec<u64> {
        let count: u64 = env.storage().instance().get(&COUNTER_KEY).unwrap_or(0);
        let mut ids = Vec::new(&env);
        if count == 0 {
            return ids;
        }
        let begin = core::cmp::max(start, 1);
        let end = core::cmp::min(begin.saturating_add(core::cmp::min(limit, 1000)), count.saturating_add(1));
        for id in begin..end {
            ids.push_back(id);
        }
        ids
    }

    pub fn escrow_summaries(env: Env, ids: Vec<u64>) -> Map<u64, EscrowStatus> {
        let mut result = Map::new(&env);
        for id in ids.iter() {
            let key = escrow_key(id);
            if let Some(e) = env.storage().persistent().get::<_, Escrow>(&key) {
                result.set(id, e.status);
            }
        }
        result
    }

    pub fn get_oracle(env: Env) -> Address {
        env.storage().instance().get(&ORACLE_KEY)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotInitialized))
    }

    pub fn version() -> u32 { CONTRACT_VERSION }
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

    #[test]
    fn test_version() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let oracle = Address::generate(&env);
        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin, &oracle);
        assert_eq!(client.version(), CONTRACT_VERSION);
    }

    #[test]
    fn gas_profile_full_flow() {
        let env = Env::default();
        env.cost_estimate().budget().reset_unlimited();
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

        let id = client.create_escrow(&admin, &receiver, &token, &5000_i128, &100_u32, &1_u32);
        assert_eq!(id, 1);
        client.counterparty_approve(&1);
        client.settle(&1);

        let escrow = client.get_escrow(&id).unwrap();
        assert_eq!(escrow.status, EscrowStatus::Settled);

        let balance = soroban_sdk::token::Client::new(&env, &token).balance(&receiver);
        assert_eq!(balance, 4750i128, "Gas test: FX conversion incorrect");
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
        oracle_client.set_rate(&token, &95000);
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
        oracle_client.set_rate(&token, &50000);
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
        let expected = deposit * 50000 / FX_RATE_DENOMINATOR;
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
    fn test_pause_unpause() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let oracle = Address::generate(&env);
        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin, &oracle);
        assert!(!client.is_paused());
        client.pause();
        assert!(client.is_paused());
        client.unpause();
        assert!(!client.is_paused());
    }

    #[test]
    fn test_transfer_admin() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let new_admin = Address::generate(&env);
        let oracle = Address::generate(&env);
        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin, &oracle);
        assert_eq!(client.admin(), admin);
        client.transfer_admin(&new_admin);
        assert_eq!(client.admin(), new_admin);
    }

    #[test]
    fn test_invalid_amount_rejected() {
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
        let r = client.try_create_escrow(&admin, &receiver, &token, &0_i128, &100_u32, &1_u32);
        assert!(r.is_err());
        let r = client.try_create_escrow(&admin, &receiver, &token, &-1_i128, &100_u32, &1_u32);
        assert!(r.is_err());
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

    #[test]
    fn invariant_counter_always_increments() {
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
        let expected = deposit * 95000 / FX_RATE_DENOMINATOR;
        assert_eq!(after - before, expected,
            "Invariant violated: receiver should receive deposit x fx_rate ({} x 0.95 = {})", deposit, expected);
        assert_eq!(client.get_escrow(&1).unwrap().status, EscrowStatus::Settled);
    }

    #[test]
    fn invariant_double_settle_always_fails() {
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
        assert_eq!(client.get_escrow(&1).unwrap().status, EscrowStatus::Cancelled);
    }

    #[test]
    fn invariant_settled_escrow_cannot_be_refunded() {
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

    #[test]
    fn fuzz_random_escrow_lifecycle() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let token = create_sac(&env, &admin);
        let oracle_id = env.register(oracle::WASM, ());
        let oracle_client = oracle::Client::new(&env, &oracle_id);
        oracle_client.init(&admin);
        oracle_client.set_rate(&token, &100000);
        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin, &oracle_id);
        let mut expected_count: u64 = 0;
        let mut escrow_ids: soroban_sdk::Vec<u64> = soroban_sdk::Vec::new(&env);
        let mut receivers: soroban_sdk::Vec<Address> = soroban_sdk::Vec::new(&env);
        for _ in 0..10 {
            receivers.push_back(Address::generate(&env));
        }
        for step in 0..50 {
            match step % 5 {
                0 => {
                    let receiver = receivers.get((step % receivers.len()) as u32).unwrap();
                    let amount = ((step as i128 + 1) * 1000) % 100000 + 100;
                    let timeout = (step as u32 * 10) % 5000 + 100;
                    let corridor = ((step % 5) + 1) as u32;
                    let id = client.create_escrow(&admin, &receiver, &token, &amount, &timeout, &corridor);
                    expected_count += 1;
                    escrow_ids.push_back(id);
                    let e = client.get_escrow(&id).unwrap();
                    assert_eq!(e.sender, admin, "Fuzz: sender mismatch");
                    assert_eq!(e.status, EscrowStatus::Created, "Fuzz: new escrow not Created");
                    assert_eq!(client.escrow_count(), expected_count, "Fuzz: counter mismatch");
                }
                1 | 2 => {
                    let mut found: Option<u64> = None;
                    for i in 0..escrow_ids.len() {
                        let id = escrow_ids.get(i).unwrap();
                        if let Some(e) = client.get_escrow(&id) {
                            if e.status == EscrowStatus::Created { found = Some(id); break; }
                        }
                    }
                    if let Some(id) = found {
                        client.counterparty_approve(&id);
                        client.settle(&id);
                        let settled = client.get_escrow(&id).unwrap();
                        assert_eq!(settled.status, EscrowStatus::Settled, "Fuzz: settle didn't transition");
                        assert!(client.try_settle(&id).is_err());
                        assert!(client.try_refund(&id).is_err());
                        assert!(client.try_cancel(&id).is_err());
                    }
                }
                3 => {
                    let mut found: Option<u64> = None;
                    for i in 0..escrow_ids.len() {
                        let id = escrow_ids.get(i).unwrap();
                        if let Some(e) = client.get_escrow(&id) {
                            if e.status == EscrowStatus::Created { found = Some(id); break; }
                        }
                    }
                    if let Some(id) = found {
                        client.cancel(&id);
                        let cancelled = client.get_escrow(&id).unwrap();
                        assert_eq!(cancelled.status, EscrowStatus::Cancelled, "Fuzz: cancel didn't transition");
                        assert!(client.try_settle(&id).is_err(), "Fuzz: cancelled escrow accepted settle");
                        assert!(client.try_cancel(&id).is_err(), "Fuzz: cancelled escrow accepted cancel");
                    }
                }
                4 => {
                    let current = client.escrow_count();
                    assert!(current >= expected_count, "Fuzz: counter decreased from {} to {}", expected_count, current);
                }
                _ => {}
            }
        }
        let list = client.list_escrows(&1, &expected_count);
        for i in 0..list.len() {
            let id = list.get(i).unwrap();
            let e = client.get_escrow(&id).unwrap();
            match e.status {
                EscrowStatus::Created | EscrowStatus::CounterpartyApproved |
                EscrowStatus::Settled | EscrowStatus::Refunded | EscrowStatus::Cancelled => {}
            }
        }
        assert_eq!(client.escrow_count(), expected_count, "Fuzz: final counter mismatch");
    }
}
