# AnchorFX — InstaAward Sprint Proposal

## 30-Day Sprint: Mainnet Readiness & Anchor Integration

**Award Request:** $5,000 XLM  
**Builder:** Subheeksh Koma  
**Sprint Duration:** June 22 – July 22, 2026  
**Chapter:** [TBD — Ambassador Chapter name]

---

## 1. Current State

AnchorFX is a working cross-border FX settlement protocol on Stellar testnet with:
- 2 Soroban contracts (Escrow + Oracle) — deployed, tested (27/27)
- Production frontend (Next.js 16, Vercel) — 26/26 tests passing
- 50+ testnet users, 36+ on-chain transactions
- 5 FX corridors (US→PH, US→MX, EUR→BR, US→NG, EUR→IN)
- Full security audit remediation applied (257 findings resolved)
- MIT licensed, open source on GitHub

**What works today:** Full escrow lifecycle (create → approve → settle / refund / cancel), wallet connect (Freighter + xBull), FX rate oracle, admin dashboard, SSE event streaming, export/audit, mobile-responsive UI.

**What needs the sprint:** Mainnet deployment, real SEP-31 integration, Mercury streaming, anchor operator landing page, external security review.

---

## 2. Sprint Scope — 4 Concrete Deliverables

### D-1: Stellar Mainnet Deployment
**Effort:** 5 days

- [ ] Fund mainnet account (1 XLM minimum + contract deploy fees)
- [ ] Build and optimize escrow WASM for mainnet (verify `opt-level = "z"` at target size)
- [ ] Deploy escrow contract to Stellar Pubnet
- [ ] Deploy oracle contract and configure initial rates
- [ ] Verify contract on stellar.expert (pubnet)
- [ ] Update frontend env config to use mainnet RPC/Horizon URLs
- [ ] Test full escrow lifecycle on mainnet with real XLM
- [ ] 10+ verified mainnet user transactions

**Success:** Contracts deployed on pubnet, 10+ real TXs, frontend switchable between testnet/mainnet.

### D-2: SEP-31 Receive Endpoint (Real Implementation)
**Effort:** 7 days

- [ ] Implement proper SEP-31 `/info` endpoint returning TOML-compliant anchor metadata
- [ ] Implement `/transactions` POST (receive) with Stellar address validation
- [ ] Implement `/transactions/:id` GET (status) with escrow contract state lookup
- [ ] Implement `/transactions/:id` PATCH for customer data updates
- [ ] Create `stellar.toml` with anchor info and SEP-31 declaration
- [ ] Test against Stellar SEP-31 validation tools
- [ ] Document integration guide for anchor operators

**Success:** SEP-31 endpoints pass Stellar validation; anchor operators can integrate via documented API.

### D-3: Mercury Event Streaming
**Effort:** 5 days

- [ ] Set up Mercury indexer for AnchorFX escrow + oracle contracts
- [ ] Replace SSE polling with Mercury webhook/subscription
- [ ] Update frontend event feed to use Mercury real-time stream
- [ ] Add event replay/history support via Mercury
- [ ] Document Mercury integration architecture

**Success:** Live event updates via Mercury, no more SSE polling, ~5s latency.

### D-4: Anchor Operator Landing Page + Docs
**Effort:** 5 days

- [ ] Create `/anchors` landing page for anchor operators (pricing, features, integration steps)
- [ ] Write anchor operator integration guide (step-by-step, code examples)
- [ ] Create API reference docs for SEP-31 endpoints
- [ ] Add "Become an Anchor" CTA flow
- [ ] Demo video segment showing anchor onboarding

**Success:** Self-serve documentation; an anchor operator can integrate without direct support.

### Buffer: Ambassador Chapter Engagement (ongoing)
**Effort:** 8 days (spread across sprint)

- [ ] Attend 2+ chapter meetups
- [ ] Present AnchorFX demo to chapter
- [ ] Collect feedback from chapter builders
- [ ] Incorporate feedback into product
- [ ] Submit InstaAward progress reports to Chapter Lead

---

## 3. Timeline

| Week | Dates | Focus |
|------|-------|-------|
| **Week 1** | Jun 22-28 | D-1: Mainnet deployment + contract instantiation |
| **Week 2** | Jun 29 - Jul 5 | D-2: SEP-31 endpoints (info, transactions, validation) |
| **Week 3** | Jul 6-12 | D-3: Mercury streaming, D-4 start |
| **Week 4** | Jul 13-19 | D-4: Landing page + docs + polish |
| **Buffer** | Jul 20-22 | Ambassador demos, final review, sprint report |

---

## 4. Budget Breakdown

| Item | XLM (approx) | USD |
|------|-------------|-----|
| Mainnet account + contract deployment | 30 XLM | ~$3 |
| Development (160 hours × $25/hr) | — | $4,000 |
| Mercury infrastructure (1 month) | — | $50 |
| External security review (light) | — | $500 |
| Documentation + demo | — | $447 |
| **Total** | | **$5,000** |

---

## 5. Success Metrics

| Metric | Target |
|--------|--------|
| Mainnet contracts deployed | 2 (escrow + oracle) |
| Mainnet user transactions | 10+ |
| SEP-31 endpoints passing validation | 4 (info, POST, GET, PATCH) |
| Mercury streaming latency | < 10s |
| Anchor operator docs | Complete + self-serve |
| Ambassador chapter presentations | 2+ |
| User feedback on mainnet | 5+ |

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Soroban mainnet not yet available for general use | Deploy to Stellar testnet upgraded environment; document mainnet-readiness |
| Mercury indexer delay | Fall back to improved SSE with reconnect + retry |
| Single builder bandwidth | Scope is concrete and bounded; 30 days is achievable for 4 deliverables |
| Ambassador Chapter not found locally | Engage with nearest chapter remotely; SCF community team can help place |

---

## 7. Previous Sprint (Pre-InstaAward)

**Completed (June 18-21, 2026):**

- [x] Green Belt + Blue Belt production readiness
- [x] Full security audit (257 findings → all critical/high fixed)
- [x] Contract storage redesign (per-key, O(1))
- [x] Checks-effects-interactions reorder
- [x] Pause/unpause circuit breaker
- [x] Admin transfer capability
- [x] Input validation on all contract entry points
- [x] Typed errors throughout both contracts
- [x] Production security headers (HSTS, COEP, COOP)
- [x] CI hardening (tsc + clippy + audit + prettier)
- [x] License resolved (MIT)
- [x] 53/53 tests passing (27 contract + 26 frontend)
