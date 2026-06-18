#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env};

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub enum EscrowStatus {
    Created,
    Settled,
    Refunded,
}

#[derive(Clone, Debug)]
#[contracttype]
pub struct Escrow {
    pub sender: Address,
    pub receiver: Address,
    pub token: Address,
    pub amount: i128,
    pub timeout_ledger: u32,
    pub status: EscrowStatus,
    pub created_at: u32,
}

const ESCROW_KEY: soroban_sdk::Symbol = symbol_short!("ESCROW");
const ADMIN_KEY: soroban_sdk::Symbol = symbol_short!("ADMIN");

#[contract]
pub struct AnchorFxEscrow;

#[contractimpl]
impl AnchorFxEscrow {
    pub fn init(env: Env, admin: Address) {
        env.storage().instance().set(&ADMIN_KEY, &admin);
    }

    pub fn create(
        env: Env,
        sender: Address,
        receiver: Address,
        token: Address,
        amount: i128,
        timeout_blocks: u32,
    ) {
        sender.require_auth();
        assert!(!env.storage().persistent().has(&ESCROW_KEY), "Escrow exists");

        let escrow = Escrow {
            sender: sender.clone(), receiver: receiver.clone(), token: token.clone(),
            amount, timeout_ledger: env.ledger().sequence() + timeout_blocks,
            status: EscrowStatus::Created, created_at: env.ledger().sequence(),
        };

        soroban_sdk::token::Client::new(&env, &token)
            .transfer(&sender, &env.current_contract_address(), &amount);

        env.storage().persistent().set(&ESCROW_KEY, &escrow);
        env.storage().persistent().extend_ttl(&ESCROW_KEY, timeout_blocks + 1000, timeout_blocks + 1000);
        env.events().publish((symbol_short!("created"),), (sender, receiver, token, amount, timeout_blocks));
    }

    pub fn settle(env: Env) {
        let admin: Address = env.storage().instance().get(&ADMIN_KEY).unwrap();
        admin.require_auth();
        let mut escrow: Escrow = env.storage().persistent().get(&ESCROW_KEY).unwrap();
        assert!(escrow.status == EscrowStatus::Created, "Already resolved");

        soroban_sdk::token::Client::new(&env, &escrow.token)
            .transfer(&env.current_contract_address(), &escrow.receiver, &escrow.amount);

        escrow.status = EscrowStatus::Settled;
        env.storage().persistent().set(&ESCROW_KEY, &escrow);
        env.events().publish((symbol_short!("settled"),), (escrow.receiver, escrow.amount));
    }

    pub fn refund(env: Env) {
        let escrow: Escrow = env.storage().persistent().get(&ESCROW_KEY).unwrap();
        assert!(escrow.status == EscrowStatus::Created, "Already resolved");
        assert!(env.ledger().sequence() >= escrow.timeout_ledger, "Too early");

        soroban_sdk::token::Client::new(&env, &escrow.token)
            .transfer(&env.current_contract_address(), &escrow.sender, &escrow.amount);

        let mut updated = escrow;
        updated.status = EscrowStatus::Refunded;
        env.storage().persistent().set(&ESCROW_KEY, &updated);
        env.events().publish((symbol_short!("refunded"),), (updated.sender, updated.amount));
    }

    pub fn get_escrow(env: Env) -> Option<Escrow> {
        env.storage().persistent().get(&ESCROW_KEY)
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&ADMIN_KEY).unwrap_or_else(|| panic!("Not init"))
    }

    pub fn version() -> u32 { 1 }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::{Address as _, Ledger}, Address, Env};

    fn create_sac(env: &Env, admin: &Address) -> Address {
        let sac = env
            .register_stellar_asset_contract_v2(admin.clone());
        let token = soroban_sdk::token::StellarAssetClient::new(env, &sac.address());
        token.mint(&admin, &10000000);
        sac.address()
    }

    #[test]
    fn test_version() {
        let env = Env::default();
        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        assert_eq!(client.version(), 1);
    }

    #[test]
    fn test_full_flow() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let receiver = Address::generate(&env);

        let token = create_sac(&env, &admin);

        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin);

        // sender = admin (who holds the SAC tokens)
        client.create(&admin, &receiver, &token, &1000_i128, &100_u32);
        let escrow = client.get_escrow().unwrap();
        assert_eq!(escrow.sender, admin);
        assert_eq!(escrow.status, EscrowStatus::Created);

        client.settle();
        let settled = client.get_escrow().unwrap();
        assert_eq!(settled.status, EscrowStatus::Settled);
    }

    #[test]
    fn test_refund_after_timeout() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = create_sac(&env, &admin);

        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin);
        client.create(&admin, &receiver, &token, &2000_i128, &5_u32);

        env.ledger().set_sequence_number(env.ledger().sequence() + 10);

        client.refund();
        let refunded = client.get_escrow().unwrap();
        assert_eq!(refunded.status, EscrowStatus::Refunded);
    }

    #[test]
    fn test_cannot_settle_twice() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = create_sac(&env, &admin);

        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin);
        client.create(&admin, &receiver, &token, &500_i128, &100_u32);

        client.settle();
        let settled = client.get_escrow().unwrap();
        assert_eq!(settled.status, EscrowStatus::Settled);

        let result = client.try_settle();
        assert!(result.is_err());
    }

    #[test]
    fn test_refund_too_early() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token = create_sac(&env, &admin);

        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(&env, &contract_id);
        client.init(&admin);
        client.create(&admin, &receiver, &token, &500_i128, &100_u32);

        let result = client.try_refund();
        assert!(result.is_err());

        let escrow = client.get_escrow().unwrap();
        assert_eq!(escrow.status, EscrowStatus::Created);
    }
}
