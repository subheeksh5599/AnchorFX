#[cfg(test)]
mod test {
    use soroban_sdk::testutils::{Address as _, Ledger};
    use soroban_sdk::{token, Address, Env};

    use crate::{AnchorFxEscrow, AnchorFxEscrowClient, EscrowStatus};

    fn create_token<'a>(e: &Env, admin: &Address) -> (Address, token::StellarAssetClient<'a>) {
        let sac = e.register_stellar_asset_contract_v2(admin.clone());
        let token_addr = sac.address();
        let sac_client = token::StellarAssetClient::new(e, &token_addr);
        (token_addr, sac_client)
    }

    fn balance(env: &Env, token: &Address, account: &Address) -> i128 {
        token::Client::new(env, token).balance(account)
    }

    fn deploy_escrow(env: &Env, admin: &Address) -> (Address, AnchorFxEscrowClient) {
        let contract_id = env.register(AnchorFxEscrow, ());
        let client = AnchorFxEscrowClient::new(env, &contract_id);
        client.init(admin);
        (contract_id, client)
    }

    #[test]
    fn test_full_flow() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let sender = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token_admin = Address::generate(&env);

        let (token_addr, token_sac) = create_token(&env, &token_admin);
        let (contract_id, escrow_client) = deploy_escrow(&env, &admin);

        token_sac.mint(&sender, &1000_i128);

        escrow_client.create(&sender, &receiver, &token_addr, &500_i128, &200_u32);

        let escrow = escrow_client.get_escrow();
        assert!(escrow.is_some());
        let e = escrow.unwrap();
        assert_eq!(e.amount, 500_i128);
        assert_eq!(e.sender, sender);
        assert_eq!(e.receiver, receiver);
        assert_eq!(balance(&env, &token_addr, &sender), 500);
        assert_eq!(balance(&env, &token_addr, &contract_id), 500);

        escrow_client.settle();
        assert_eq!(balance(&env, &token_addr, &receiver), 500);

        let settled = escrow_client.get_escrow().unwrap();
        assert!(matches!(settled.status, EscrowStatus::Settled));
    }

    #[test]
    fn test_refund_after_timeout() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let sender = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token_admin = Address::generate(&env);

        let (token_addr, token_sac) = create_token(&env, &token_admin);
        let (_contract_id, escrow_client) = deploy_escrow(&env, &admin);

        token_sac.mint(&sender, &1000_i128);

        escrow_client.create(&sender, &receiver, &token_addr, &500_i128, &100_u32);

        env.ledger().with_mut(|li| {
            li.sequence_number += 200;
        });

        escrow_client.refund();
        assert_eq!(balance(&env, &token_addr, &sender), 1000);

        let escrow = escrow_client.get_escrow().unwrap();
        assert!(matches!(escrow.status, EscrowStatus::Refunded));
    }

    #[test]
    #[should_panic(expected = "Escrow already resolved")]
    fn test_cannot_settle_twice() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let sender = Address::generate(&env);
        let receiver = Address::generate(&env);
        let token_admin = Address::generate(&env);

        let (token_addr, token_sac) = create_token(&env, &token_admin);
        let (_contract_id, escrow_client) = deploy_escrow(&env, &admin);

        token_sac.mint(&sender, &1000_i128);

        escrow_client.create(&sender, &receiver, &token_addr, &500_i128, &200_u32);
        escrow_client.settle();
        escrow_client.settle();
    }

    #[test]
    fn test_version() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let (_contract_id, escrow_client) = deploy_escrow(&env, &admin);
        assert_eq!(escrow_client.version(), 1);
    }
}
