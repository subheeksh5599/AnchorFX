# AnchorFX Progress Log

## 2026-06-18
### Deploy Flow — FIXED
- Contract deploys via RPC prepareTransaction (8.8KB WASM fits limits)
- Init called as background step (non-blocking success)
- Contract ID computed properly via StrKey.encodeContract(SHA256 preimage)
- Success reported immediately after contract creation, init status logged separately

### Read State — FIXED
- Rewrote to use simulateTransaction + contract call pattern
- Reads escrow via `get_escrow(id)` function instead of raw ledger storage
- Handles new Map-based escrow storage format

### Contract (Orange Belt)
- Multi-escrow factory with FX Rate Oracle integration
- 8 passing tests
- Oracle contract deployed separately for cross-contract calls

### To Do
- [ ] End-to-end test on live deploy
- [ ] Google Form for user onboarding
- [ ] Analytics integration
- [ ] Pitch deck
- [ ] 50+ users onboarding plan
