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

### Production Quality — VERIFIED
- Contract tests: 8/8 passing
- Frontend tests: 26/26 passing
- All routes: / (200), /wallet (200), /contract (200), /api/events (SSE stream)
- Deploy flow: Success → Contract ID (StrKey.encodeContract, deterministic)
- Read state: simulateTransaction + get_escrow(id), Map-based storage
- Feedback form: embedded on /contract page

### Green Belt Checklist
- [x] Production MVP — deploy, read, events all working
- [x] Mobile responsive — tested at 375px iPhone X
- [x] Error handling — all states (loading, empty, error, success)
- [x] CI/CD pipeline — GitHub Actions (cargo test + npm test + build)
- [x] Security — rate limiting, input validation, CSP headers, no secrets
- [x] README with Green Belt docs
- [x] User feedback form (Google Form link)
- [ ] Demo video link
- [ ] Real Google Form ID (replace placeholder)
- [ ] 10+ real user responses collected

### To Do
- [ ] Replace Google Form placeholder with real form link
- [ ] Record/provide demo video link  
- [ ] Collect 10+ real user feedback entries
- [ ] Blue Belt: pitch deck, 50+ users, feature iteration

