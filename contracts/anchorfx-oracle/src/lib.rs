#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, contracterror, symbol_short, panic_with_error, Address, Env, Map};

#[contracttype]
pub struct RateData {
    pub rate: u64,
    pub updated_at: u32,
    pub expires_at: u32,
}

const RATE_EXPIRY_LEDGERS: u32 = 17280; // ~24h
const RATES_TTL_THRESHOLD: u32 = 20_000;
const RATES_TTL_EXTEND: u32 = 20_000;

#[derive(Copy, Clone, Debug, PartialEq, Eq)]
#[contracterror]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    RateNotFound = 3,
    RateExpired = 4,
    NoRatesConfigured = 5,
    InvalidRate = 6,
    Unauthorized = 7,
}

const ADMIN_KEY: soroban_sdk::Symbol = symbol_short!("ADMIN");
const RATES_KEY: soroban_sdk::Symbol = symbol_short!("RATES");

#[contract]
pub struct AnchorFxOracle;

#[contractimpl]
impl AnchorFxOracle {
    pub fn init(env: Env, admin: Address) {
        admin.require_auth();
        if let Some(_) = env.storage().instance().get::<_, Address>(&ADMIN_KEY) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        env.storage().instance().set(&ADMIN_KEY, &admin);
        env.events().publish((symbol_short!("init"),), admin);
    }

    /// Set exchange rate for a token (admin only)
    pub fn set_rate(env: Env, token: Address, rate: u64) {
        let admin: Address = env.storage().instance().get(&ADMIN_KEY)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotInitialized));
        admin.require_auth();

        if rate == 0 {
            panic_with_error!(&env, Error::InvalidRate);
        }

        let now = env.ledger().sequence();
        let data = RateData {
            rate,
            updated_at: now,
            expires_at: now + RATE_EXPIRY_LEDGERS,
        };

        let mut rates: Map<Address, RateData> = env.storage().persistent()
            .get(&RATES_KEY)
            .unwrap_or_else(|| Map::new(&env));
        rates.set(token.clone(), data);
        env.storage().persistent().set(&RATES_KEY, &rates);
        env.storage().persistent().extend_ttl(&RATES_KEY, RATES_TTL_THRESHOLD, RATES_TTL_EXTEND);

        env.events().publish((symbol_short!("rate_set"),), (token, rate));
    }

    /// Remove a rate entry for a token (admin only)
    pub fn remove_rate(env: Env, token: Address) {
        let admin: Address = env.storage().instance().get(&ADMIN_KEY)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotInitialized));
        admin.require_auth();

        let mut rates: Map<Address, RateData> = env.storage().persistent()
            .get(&RATES_KEY)
            .unwrap_or_else(|| Map::new(&env));
        rates.remove(token.clone());
        env.storage().persistent().set(&RATES_KEY, &rates);
        env.storage().persistent().extend_ttl(&RATES_KEY, RATES_TTL_THRESHOLD, RATES_TTL_EXTEND);

        env.events().publish((symbol_short!("rate_rem"),), token);
    }

    /// Transfer admin authority (current admin only)
    pub fn transfer_admin(env: Env, new_admin: Address) {
        let admin: Address = env.storage().instance().get(&ADMIN_KEY)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotInitialized));
        admin.require_auth();
        env.storage().instance().set(&ADMIN_KEY, &new_admin);
        env.events().publish((symbol_short!("admin_xfr"),), (admin, new_admin));
    }

    /// Get current rate for a token (reverts if stale)
    pub fn get_rate(env: Env, token: Address) -> u64 {
        let rates: Map<Address, RateData> = env.storage().persistent()
            .get(&RATES_KEY)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NoRatesConfigured));

        let data = rates.get(token.clone())
            .unwrap_or_else(|| panic_with_error!(&env, Error::RateNotFound));

        let now = env.ledger().sequence();
        if now > data.expires_at {
            env.events().publish((symbol_short!("rate_exp"),), (token, data.rate, now));
            panic_with_error!(&env, Error::RateExpired);
        }

        data.rate
    }

    /// Check if a rate is still valid (non-reverting)
    pub fn is_rate_valid(env: Env, token: Address) -> bool {
        let rates: Map<Address, RateData> = match env.storage().persistent().get(&RATES_KEY) {
            Some(r) => r,
            None => return false,
        };
        let data = match rates.get(token) {
            Some(d) => d,
            None => return false,
        };
        env.ledger().sequence() <= data.expires_at
    }

    pub fn admin(env: Env) -> Address {
        env.storage().instance().get(&ADMIN_KEY)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotInitialized))
    }

    pub fn version() -> u32 { 2 }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    #[test]
    fn test_set_and_get_rate() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        let contract_id = env.register(AnchorFxOracle, ());
        let client = AnchorFxOracleClient::new(&env, &contract_id);
        client.init(&admin);
        client.set_rate(&token, &105000);
        assert_eq!(client.get_rate(&token), 105000);
        assert!(client.is_rate_valid(&token));
    }

    #[test]
    fn test_rate_not_found() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        let contract_id = env.register(AnchorFxOracle, ());
        let client = AnchorFxOracleClient::new(&env, &contract_id);
        client.init(&admin);
        let result = client.try_get_rate(&token);
        assert!(result.is_err());
    }

    #[test]
    fn test_zero_rate_rejected() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        let contract_id = env.register(AnchorFxOracle, ());
        let client = AnchorFxOracleClient::new(&env, &contract_id);
        client.init(&admin);
        let result = client.try_set_rate(&token, &0);
        assert!(result.is_err());
    }

    #[test]
    fn test_remove_rate() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        let contract_id = env.register(AnchorFxOracle, ());
        let client = AnchorFxOracleClient::new(&env, &contract_id);
        client.init(&admin);
        client.set_rate(&token, &100000);
        assert!(client.is_rate_valid(&token));
        client.remove_rate(&token);
        assert!(!client.is_rate_valid(&token));
    }
}
