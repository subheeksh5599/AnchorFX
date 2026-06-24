# AnchorFX — Pitch Deck

## Atomic Cross-Border FX Settlement on Stellar

---

## Problem

**Cross-border payments are broken.**

- 3-5 days settlement time
- 5-7% average fees
- Multiple intermediaries
- Counterparty risk
- No transparency

The $800B remittance market still runs on 1970s infrastructure.

---

## Solution

**AnchorFX — Trustless escrow settlement on Stellar.**

Lock → Oracle FX Rate → Counterparty Confirm → Atomic Settle

- **5 seconds** settlement on Stellar testnet
- **< $0.001** transaction fees
- **Zero intermediaries** — Soroban smart contracts
- **No settlement risk** — multi-signature escrow with per-key storage
- **Real-time FX rates** — Oracle integration with 24h expiry
- **Pause/unpause** — emergency circuit breaker
- **Admin transfer** — no permanent admin lock-in

---

## Market Opportunity

| Segment | Size |
|---------|------|
| Global Remittances | $800B/year |
| Cross-border B2B | $150T/year |
| Stablecoin Settlement | $7T+ (2024) |
| Stellar Payment Volume | $3B+ processed |

**Target:** P2P remittance corridors in emerging markets

---

## Architecture

```
User (Sender)          User (Receiver)
    │                       │
    ▼                       ▼
┌─────────────┐       ┌─────────────┐
│ Freighter   │       │ Freighter   │
│ Wallet      │       │ Wallet      │
└──────┬──────┘       └──────┬──────┘
       │                     │
       ▼                     ▼
┌─────────────────────────────────────┐
│         AnchorFX Frontend           │
│   Next.js 16 · React 19 · Vercel    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│       Stellar Testnet (Soroban)      │
│  ┌───────────┐   ┌───────────────┐  │
│  │ Escrow    │──▶│ Oracle        │  │
│  │ Contract  │   │ Contract      │  │
│  └───────────┘   └───────────────┘  │
│  ┌───────────┐   ┌───────────────┐  │
│  │ SAC Token │   │ SSE Events    │  │
│  └───────────┘   └───────────────┘  │
└─────────────────────────────────────┘
```

---

## Escrow Lifecycle

```
┌─────────┐     ┌──────────────┐     ┌──────────┐     ┌─────────┐
│ CREATED │ ──▶ │ APPROVED     │ ──▶ │ SETTLED  │     │         │
│         │     │ (Multi-sig)  │     │ (Atomic) │     │  DONE   │
└────┬────┘     └──────────────┘     └──────────┘     │         │
     │                                                    │         │
     │              ┌──────────┐                          │         │
     └──────────────│ REFUNDED │──────────────────────────│         │
                    │ (Timeout)│                          └─────────┘
                    └──────────┘
     ┌──────────────┐
     │ PAUSED       │  ← Admin circuit-breaker
     └──────────────┘
```

**Statuses:** Created → CounterpartyApproved → Settled / Refunded / Cancelled

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Rust + Soroban SDK v22 |
| Oracle | Cross-contract FX rates with 24h expiry |
| Frontend | Next.js 16 + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + Framer Motion |
| Wallet | Freighter + xBull multi-wallet |
| RPC | Soroban RPC + Horizon |
| CI/CD | GitHub Actions (tests + typecheck + clippy + lint + audit) |
| Hosting | Vercel |
| Security | HSTS + CSP + COEP/COOP + Rate Limiting + OWASP Validation |

---

## Security — Post-Audit

| Category | Fixes Applied |
|----------|--------------|
| **Storage** | Per-escrow keys (O(1) reads, no single-TTL data wipe risk) |
| **Reentrancy** | Checks-effects-interactions on all state mutations |
| **Transfer safety** | `safe_transfer` wrapper — no ignored return values |
| **Input validation** | Amount>0, timeout bounds, corridor range, oracle rate>0 enforced |
| **Admin safety** | Pause/unpause circuit breaker, admin transfer, `require_auth()` on init |
| **Audit trail** | Events on init, rate expiry, admin-cancel with caller address |
| **Typed errors** | All panics use `panic_with_error!` for client-catchable errors |
| **Security headers** | HSTS, CSP (no unsafe-inline in prod), COEP, COOP, CORP |

---

## Traction

| Metric | Value |
|--------|-------|
| Smart Contracts Deployed | 2 (Escrow + Oracle on testnet) |
| Contract Tests | 27/27 passing (23 escrow + 4 oracle) |
| Frontend Tests | 26/26 passing |
| Testnet Wallets Onboarded | 50+ |
| On-chain Transactions | 36+ verified on stellar.expert |
| Corridors Supported | 5 (US→PH, US→MX, EUR→BR, US→NG, EUR→IN) |
| CI/CD Pipeline | Full — tests + typecheck + lint + clippy + security audit |
| User Rating | 4.3/5 average (50 users) |
| Invariants Proven | 10 mathematical invariants |
| Fuzz Tests | 50-step randomized state machine |

---

## Competitive Landscape

| Solution | AnchorFX | Eascrow | Trustless Work |
|----------|----------|---------|---------------|
| Oracle FX Rates | ✅ | ❌ | ❌ |
| Multi-sig Escrow | ✅ | ✅ | ✅ |
| Soroban Native | ✅ | ✅ | ✅ |
| Live Frontend | ✅ | ❌ | ✅ |
| SAC Token Support | ✅ | ❌ | ❌ |
| SEP-31 Ready | ✅ | ❌ | ❌ |
| Pause/Emergency Stop | ✅ | ❌ | ❌ |
| Admin Rotation | ✅ | ❌ | ❌ |
| Security Audited | ✅ | ❌ | ❌ |
| Open Source | ✅ (MIT) | ✅ | ✅ |

---

## Growth Strategy

1. **InstaAward ($5K)** → Mainnet deployment + security audit + anchor onboarding
2. **Anchor Partnerships** → Onboard 3-5 Stellar anchors on mainnet
3. **SCF Build Award ($50K+)** → Scale to 1000+ users, 10 corridors
4. **Revenue Model** → 0.1% settlement fee per transaction
5. **Geographic Expansion** → APAC + LATAM + Africa corridors

---

## Roadmap

| Phase | Timeline | Deliverables |
|-------|----------|-------------|
| **Done** | Month 1 | MVP on testnet, 50+ users, security audit fixes applied |
| **InstaAward** | Month 2 | Mainnet deploy, real SEP-31 integration, Mercury streaming |
| **Build Award** | Month 3-4 | Anchor SDK, mobile app, 1000+ users |
| **Scale** | Month 6+ | 10+ corridors, institutional dashboard, banking integration |

---

## Why Stellar?

- **Purpose-built** for cross-border payments
- **SEP-31** standard for anchors
- **SAC tokens** for regulated stablecoins
- **Soroban** for programmable settlement
- **Sub-cent fees** for financial inclusion
- **Growing ecosystem** with SCF funding + Ambassador Chapters

---

## The Ask

**InstaAward: $5,000 in XLM**

To fund 30-day sprint:
- Mainnet deployment + contract instantiation
- Real SEP-31 receive endpoint with anchor integration
- Mercury event streaming (replace SSE polling)
- Landing page for anchor operators
- External security review
- Ambassador Chapter demo + user onboarding

**SCF Build Award: $50,000+ in XLM** (future)

---

## Team

**Subheeksh Koma** — Solo Builder

- Full-stack: Rust (Soroban) + TypeScript + React + Next.js
- 2 Soroban smart contracts deployed on Stellar testnet
- 53 automated tests (27 contract + 26 frontend)
- End-to-end product: contracts → RPC → frontend → CI/CD → production deploy
- Security-first development with full audit remediation

---

## Links

- **Live Demo:** https://anchorfx.vercel.app
- **GitHub:** https://github.com/subheeksh5599/AnchorFX
- **Contract (escrow):** CB4U7NLHDRGQQEKBNJ7GBPMXW4AA2VGTGEURS2FF34ZCRJMVOCFBKE26
- **Explorer:** https://stellar.expert/explorer/testnet/contract/CB4U7NL...
- **Demo Video:** https://youtu.be/FRRtzxk_aUs
- **Contact:** subheeksh.koma@anchorfx.dev
