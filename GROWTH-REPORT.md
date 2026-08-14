# AnchorFX — Monthly Growth Report

**Month:** August 2026
**Program:** Stellar Journey to Mastery — Master Track (Level 7)
**Product:** AnchorFX — atomic cross-border FX settlement on Stellar mainnet
**Live:** https://anchorfx.vercel.app
**Repo:** https://github.com/subheeksh5599/AnchorFX

---

## 1. Summary

August was the growth cycle after the July mainnet launch. The product is live on
Stellar mainnet with two audited Soroban contracts (escrow + FX oracle), 70 verified
mainnet users (20 July + 30 + 20 August cohorts), a new feature batch shipped
to address the top user-feedback requests, and a public on-chain explorer so every
transaction is verifiable.

## 2. Product Improvements This Month (with commit links)

| # | Improvement | Feedback Source | Commit |
|---|-------------|-----------------|--------|
| 1 | Public Escrow Explorer (`/explorer`) | David: "Needs API access, webhooks, dashboard" | [d02bd2c](https://github.com/subheeksh5599/AnchorFX/commit/d02bd2c) |
| 2 | Live FX Rates (`/rates` + `/api/rates`) | Maria: "Would love to see BRL pairs" | [35fc7b3](https://github.com/subheeksh5599/AnchorFX/commit/35fc7b3) |
| 3 | 6 new corridors (ARS, GHS, KES, IDR, VND, THB) | Fatima, Kenji, Anna, Carlos: "More token pairs" | [0212cf8](https://github.com/subheeksh5599/AnchorFX/commit/0212cf8) |
| 4 | Network Status page (`/status`) | David, Laura: institutional transparency | [d02bd2c](https://github.com/subheeksh5599/AnchorFX/commit/d02bd2c) |
| 5 | API Reference (`/developers`) | David: "Needs API access" | [d02bd2c](https://github.com/subheeksh5599/AnchorFX/commit/d02bd2c) |
| 6 | Live mainnet stats on landing | All users | [e2a6928](https://github.com/subheeksh5599/AnchorFX/commit/e2a6928) |

## 3. On-Chain Metrics

### Mainnet

| Metric | Value |
|--------|-------|
| Mainnet escrow contract | `CDGQ7K4XGAPG3YJVAGHCE45XOR63HLD6ARJCRESEEKSRQZSIRAKG6F6V` |
| Mainnet oracle contract | `CCOIG4R7AIUQTP5CURK4PFINFF2EVQTBGTCN636E2JY25FGY7L4K54KT` |
| Verified mainnet users | **70** (20 July + 30 Aug + 20 Aug-2) |
| On-chain escrows | 71 created (IDs 1–71), all settled |
| August cohort txns | 300 (180 × 30 users + 120 × 20 users, 6-tx lifecycle) |
| Contract tests | 27 (23 escrow + 4 oracle) |
| Frontend tests | 34 |
| CI | Green (contract tests, build, tsc, eslint, prettier) |

### Testnet (Dev & QA)

Fresh testnet deployment and escrow flows run during the August development cycle to
validate the expanded corridor set (US→AR corridor #6) and oracle rate publishing
before mainnet use. Full tx trail below.

| Step | TX |
|------|----|
| Testnet wallet funded (friendbot) | [`6cc4bf38...`](https://stellar.expert/explorer/testnet/tx/6cc4bf38795f9cfe3cd7) |
| Oracle WASM upload + deploy | [`4dec64af...`](https://stellar.expert/explorer/testnet/tx/4dec64afc7ed7fd11d6139bb5bcdaae30c15b72139be32caff855c8d3a7b353d) |
| Oracle init | [`2613673b...`](https://stellar.expert/explorer/testnet/tx/2613673bfa43bda169ced51f77d5b6af69d407673df437b6b7d7ae386ce072c1) |
| Escrow WASM upload + deploy | [`898a59ce...`](https://stellar.expert/explorer/testnet/tx/898a59ce1d0de8ae7aba718269959e70c65005b7a22208c950b250ada4946428) |
| Escrow deploy | [`e4ae9d54...`](https://stellar.expert/explorer/testnet/tx/e4ae9d541d5ed8484ff1d0ccc70a700f93e2da6ff00445cce7484d837cdb9d90) |
| Escrow init | [`60f17eb9...`](https://stellar.expert/explorer/testnet/tx/60f17eb98c6f1df779ee0fcb9933ef66ace7d875cfd8f3372a12ab144667c7f6) |
| Oracle set_rate (XLM 1.0x) | [`5f3ea2b2...`](https://stellar.expert/explorer/testnet/tx/5f3ea2b2b44bff63af32647ffc0a64c41d7868c8e9bc11322317211284aca1e3) |
| Token approve | [`eefae40a...`](https://stellar.expert/explorer/testnet/tx/eefae40a801fb53909f27cc318d9bd24a853394cce552283b633c409e8053dd5) |
| Create escrow #1 (US→PH) | [`91c68b67...`](https://stellar.expert/explorer/testnet/tx/91c68b67169f125918eb4a317216279ea4eb8924226aa6ed81afcc3f006c4555) |
| Create escrow #2 (US→AR, new corridor) | [`7c38d028...`](https://stellar.expert/explorer/testnet/tx/7c38d028bf31cefb21e7f7acd1f72c68f8fa81aa4102cdf9567b3e20a48a1917) |

Testnet contracts (Aug 2026 cycle): escrow `CBPMOQDTG535WEWSSJ2R75KZ27R4CYCH4ENVYNWX22K7EC24VN7DYFKL` · oracle `CCSQCI5AGTBVB3QF2P332LEMDAQXN7KE5IZZ4WY36BKBJD4UMUKSRCMW` · deployer `GBXIBDWOUL5I6D2ANUDQF7HNUAWVK47I7BX2MPXSGLRPPWQTX7MMXNQM`

## 4. User Feedback & Retention

- Feedback collected via [Google Form](https://docs.google.com/forms/d/e/1FAIpQLSeulA6BSWpbVZBUvv9egWKxTbr_aGe5dNy0AqyDBNH3xqSSjQ/viewform)
  and exported to [Excel](https://docs.google.com/spreadsheets/d/1XzH2UOtSGg7foc8rLsMSwb43BppifJ9J8E6no0djulw/edit?usp=sharing).
- Top requested features shipped this cycle: API access, more corridors, public transparency.
- Planned next: recurring payments, mobile push, white-label, webhooks.

## 5. Community & Marketing

- Technical blog: [Building Atomic Cross-Border Settlement on Stellar](https://dev.to/komari_subheeksh_ced2cb4c/building-atomic-cross-border-settlement-on-stellar-8io)
- Product launch post: [@AnchorFX_](https://x.com/AnchorFX_/status/2081345430995308770)
- Demo video: [@AnchorFX_](https://x.com/AnchorFX_/status/2087687947000934893)
- Followers on X: **100+** (requirement: 50) — proof available on [@AnchorFX_](https://x.com/AnchorFX_) profile
- Product update posts: [@AnchorFX_](https://x.com/AnchorFX_) — August feature-batch updates on the account

## 6. Next Month Goals

1. Continue monthly onboarding toward 100 mainnet users (Google Form + explorer-based proof)
2. Ship recurring payments (top feedback item)
3. Publish product update thread on X
4. One more community contribution (workshop/tutorial)
5. Webhooks for institutional users (David, Laura feedback)

---
*Report generated as part of the Stellar Journey to Mastery Master Track submission.*
