# AnchorFX — Monthly Growth Report

**Month:** August 2026
**Program:** Stellar Journey to Mastery — Master Track (Level 7)
**Product:** AnchorFX — atomic cross-border FX settlement on Stellar mainnet
**Live:** https://anchorfx.vercel.app
**Repo:** https://github.com/subheeksh5599/AnchorFX

---

## 1. Summary

August was the growth cycle after the July mainnet launch. The product is live on
Stellar mainnet with two audited Soroban contracts (escrow + FX oracle), 20+ verified
mainnet users from the July cohort, and a new feature batch shipped to address the
top user-feedback requests.

## 2. Product Improvements This Month (with commit links)

| # | Improvement | Feedback Source | Commit |
|---|-------------|-----------------|--------|
| 1 | Public Escrow Explorer (`/explorer`) | David: "Needs API access, webhooks, dashboard" | [a589495](https://github.com/subheeksh5599/AnchorFX/commit/a589495) |
| 2 | Live FX Rates (`/rates` + `/api/rates`) | Maria: "Would love to see BRL pairs" | [a4bacd9](https://github.com/subheeksh5599/AnchorFX/commit/a4bacd9) |
| 3 | 6 new corridors (ARS, GHS, KES, IDR, VND, THB) | Fatima, Kenji, Anna, Carlos: "More token pairs" | [9dab6cc](https://github.com/subheeksh5599/AnchorFX/commit/9dab6cc) |
| 4 | Network Status page (`/status`) | David, Laura: institutional transparency | [a589495](https://github.com/subheeksh5599/AnchorFX/commit/a589495) |
| 5 | API Reference (`/developers`) | David: "Needs API access" | [a589495](https://github.com/subheeksh5599/AnchorFX/commit/a589495) |
| 6 | Live mainnet stats on landing | All users | [316a778](https://github.com/subheeksh5599/AnchorFX/commit/316a778) |

## 3. On-Chain Metrics

| Metric | Value |
|--------|-------|
| Mainnet escrow contract | `CDGQ7K4XGAPG3YJVAGHCE45XOR63HLD6ARJCRESEEKSRQZSIRAKG6F6V` |
| Mainnet oracle contract | `CCOIG4R7AIUQTP5CURK4PFINFF2EVQTBGTCN636E2JY25FGY7L4K54KT` |
| Verified mainnet users (July cohort) | 20+ |
| On-chain transactions | 140+ (July), new activity tracked via explorer |
| Contract tests | 27 (23 escrow + 4 oracle) |
| Frontend tests | 34 |
| CI | Green (contract tests, build, tsc, eslint, prettier) |

## 4. User Feedback & Retention

- Feedback collected via [Google Form](https://docs.google.com/forms/d/e/1FAIpQLSeulA6BSWpbVZBUvv9egWKxTbr_aGe5dNy0AqyDBNH3xqSSjQ/viewform)
  and exported to [Excel](https://docs.google.com/spreadsheets/d/1XzH2UOtSGg7foc8rLsMSwb43BppifJ9J8E6no0djulw/edit?usp=sharing).
- Top requested features shipped this cycle: API access, more corridors, public transparency.
- Planned next: recurring payments, mobile push, white-label, webhooks.

## 5. Community & Marketing

- Technical blog: [Building Atomic Cross-Border Settlement on Stellar](https://dev.to/komari_subheeksh_ced2cb4c/building-atomic-cross-border-settlement-on-stellar-8io)
- Product launch post: [@Tenki_ai](https://x.com/Tenki_ai/status/2081345430995308770)
- Demo video: [@Tenki_ai](https://x.com/Tenki_ai/status/2081994208098050080)
- (In progress) Product update posts for the August feature batch

## 6. Next Month Goals

1. Onboard 50+ new mainnet users (Google Form + explorer-based proof)
2. Ship recurring payments (top feedback item)
3. Publish product update thread on X
4. Reach 50+ followers on the product account
5. One more community contribution (workshop/tutorial)

---
*Report generated as part of the Stellar Journey to Mastery Master Track submission.*
