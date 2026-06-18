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
