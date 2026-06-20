#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Map};

#[contracttype]
pub struct RateData {
    pub rate: u64,         // basis points
    pub updated_at: u32,
    pub expires_at: u32,
}

const ADMIN_KEY: soroban_sdk::Symbol = symbol_short!("ADMIN");
const RATES_KEY: soroban_sdk::Symbol = symbol_short!("RATES");

#[contract]
pub struct AnchorFxOracle;

#[contractimpl]
impl AnchorFxOracle {
    pub fn init(env: Env, admin: Address) {
        if let Some(_) = env.storage().instance().get::<_, Address>(&ADMIN_KEY) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&ADMIN_KEY, &admin);
    }

    /// Set exchange rate for a token (admin only)
    pub fn set_rate(env: Env, token: Address, rate: u64) {
        let admin: Address = env.storage().instance().get(&ADMIN_KEY).unwrap();
        admin.require_auth();

        let now = env.ledger().sequence();
        let data = RateData {
            rate,
            updated_at: now,
            expires_at: now + 17280, // ~24h of ledgers
        };

        let mut rates: Map<Address, RateData> = env.storage().persistent()
            .get(&RATES_KEY)
            .unwrap_or_else(|| Map::new(&env));
        rates.set(token.clone(), data);
        env.storage().persistent().set(&RATES_KEY, &rates);
        env.storage().persistent().extend_ttl(&RATES_KEY, 20000, 20000);

        env.events().publish((symbol_short!("rate_set"),), (token, rate));
    }

    /// Get current rate for a token (reverts if stale)
    pub fn get_rate(env: Env, token: Address) -> u64 {
        let rates: Map<Address, RateData> = env.storage().persistent()
            .get(&RATES_KEY)
            .unwrap_or_else(|| panic!("No rates configured"));

        let data = rates.get(token.clone())
            .unwrap_or_else(|| panic!("Rate not found for token"));

        let now = env.ledger().sequence();
        if now > data.expires_at {
            panic!("Rate has expired");
        }

        data.rate
    }

    /// Check if a rate is stale (caller decides what to do)
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
        env.storage().instance().get(&ADMIN_KEY).unwrap_or_else(|| panic!("Not init"))
    }

    pub fn version() -> u32 { 1 }
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
}
