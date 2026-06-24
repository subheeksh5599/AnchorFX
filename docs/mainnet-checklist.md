# AnchorFX — Mainnet Deployment Checklist

> Target: Deploy AnchorFX escrow + oracle contracts to Stellar Pubnet.

## Pre-Deployment

- [ ] **Fund mainnet account** — Minimum 2 XLM (1 for base reserve, ~10-20 XLM for contract deployment)
- [ ] **Verify WASM builds** — `just build-wasm` produces optimized WASM for both contracts
- [ ] **Run full CI** — `just ci` (cargo test ×2 + npm test + tsc + prettier + clippy + audit)
- [ ] **Set mainnet env vars** — Create `.env.production` with:
  - `NEXT_PUBLIC_RPC_URL` → mainnet Soroban RPC
  - `NEXT_PUBLIC_HORIZON_URL` → mainnet Horizon
  - `NEXT_PUBLIC_NETWORK=MAINNET`
  - `STELLAR_SECRET_KEY` → mainnet admin secret (NEVER COMMIT)
  - `CONTRACT_ID` → (set after deployment)
  - `NEXT_PUBLIC_ADMIN_PUBLIC_KEY` → mainnet admin public key
- [ ] **External security review** — Light audit or peer review of contracts before mainnet funds
- [ ] **Verify contract version** — `version()` returns 3 (escrow) and 2 (oracle)
- [ ] **Test full lifecycle on testnet one final time** — create → approve → settle → verify balance

## Deployment

### Escrow Contract
```bash
stellar contract deploy \
  --wasm contracts/anchorfx-escrow/target/wasm32-unknown-unknown/release/anchorfx_escrow.wasm \
  --source <MAINNET_SECRET_KEY> \
  --network public
```

### Oracle Contract
```bash
stellar contract deploy \
  --wasm contracts/anchorfx-oracle/target/wasm32-unknown-unknown/release/anchorfx_oracle.wasm \
  --source <MAINNET_SECRET_KEY> \
  --network public
```

### Initialize Oracle
```bash
stellar contract invoke \
  --id <ORACLE_CONTRACT_ID> \
  --source <MAINNET_SECRET_KEY> \
  --network public \
  -- init --admin <ADMIN_PUBLIC_KEY>
```

### Set Initial FX Rates
```bash
stellar contract invoke \
  --id <ORACLE_CONTRACT_ID> \
  --source <MAINNET_SECRET_KEY> \
  --network public \
  -- set_rate --token <XLM_SAC_ADDRESS> --rate 105000
```

### Initialize Escrow
```bash
stellar contract invoke \
  --id <ESCROW_CONTRACT_ID> \
  --source <MAINNET_SECRET_KEY> \
  --network public \
  -- init --admin <ADMIN_PUBLIC_KEY> --oracle <ORACLE_CONTRACT_ID>
```

## Post-Deployment Verification

- [ ] **Verify escrow contract** on [stellar.expert](https://stellar.expert) (pubnet)
- [ ] **Verify oracle contract** on stellar.expert
- [ ] **Test create_escrow** with 0.5 XLM
- [ ] **Test counterparty_approve**
- [ ] **Test settle** and verify receiver balance
- [ ] **Test refund** after timeout
- [ ] **Test cancel** as admin
- [ ] **Test pause/unpause**
- [ ] **10+ real mainnet transactions** from different accounts
- [ ] **Update frontend** to use mainnet contract IDs

## Frontend Mainnet Switch

1. Set `NEXT_PUBLIC_NETWORK=MAINNET` in Vercel env
2. Set `CONTRACT_ID` to mainnet escrow contract ID
3. Set `ESCROW_CONTRACT_ID` to mainnet escrow contract ID
4. Set `NEXT_PUBLIC_RPC_URL` to mainnet Soroban RPC
5. Set `NEXT_PUBLIC_HORIZON_URL` to mainnet Horizon
6. Deploy frontend to Vercel production
7. Verify wallet connect works with mainnet Freighter
8. Verify `/wallet`, `/contract`, `/anchors`, `/admin` routes

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Contract bug | Pause immediately via admin; funds remain in escrow |
| Oracle rate error | Admin can update rates; rates expire after 24h |
| Admin key compromise | Transfer admin to new key; old key loses authority |
| Frontend RPC failure | Fallback RPC URLs in env config |
| Insufficient mainnet XLM | Fund from exchange or Stellar DEX (USDC → XLM) |

## Rollback Plan

If critical issues are found post-deployment:
1. Pause contract (`pause()`)
2. All existing escrows can still be refunded by senders
3. Fix contract, redeploy, update frontend CONTRACT_ID
4. Unpause

## Estimated Costs

| Item | XLM | USD (approx) |
|------|-----|-------------|
| Account creation + base reserve | 1 | $0.10 |
| WASM upload (escrow) | ~5 | $0.50 |
| WASM upload (oracle) | ~3 | $0.30 |
| Contract instantiation ×2 | ~5 | $0.50 |
| 10 test transactions | ~1 | $0.10 |
| **Total** | **~15 XLM** | **~$1.50** |
