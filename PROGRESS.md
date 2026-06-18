# AnchorFX Progress Log

## 2026-06-18 — Green Belt Production Readiness

### Deploy Flow — FIXED
- Contract deploys via RPC prepareTransaction (8.8KB WASM fits limits)
- Init called as background step (non-blocking success)
- Contract ID computed via StrKey.encodeContract(SHA256 preimage)
- Success reported immediately — no more "Failed" on successful deploys

### Read State — FIXED
- Rewrote to use simulateTransaction + get_escrow(id) contract call
- Handles new Map-based escrow storage format
- Works with any contract that has get_escrow function

### Contract (Orange Belt ready)
- Multi-escrow factory with FX Rate Oracle
- 8 passing tests (full flow, multi, refund, cancel, summaries, oracle update, dupes, version)
- Oracle contract: set_rate, get_rate, is_rate_valid, expiry, cross-contract calls

### Production Quality
- All 3 routes tested 200 (/, /wallet, /contract)
- Contract purpose explained on page (Create/Settle/Refund/Events cards)
- Google Form link added for user feedback collection
- Production README with Green Belt submission docs

### To Do
- [ ] Replace Google Form placeholder with real form link
- [ ] Record/provide demo video link
- [ ] Collect 10+ real user feedback entries
- [ ] Blue Belt: pitch deck, 50+ users

