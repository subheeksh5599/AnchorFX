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
- **No settlement risk** — multi-signature escrow
- **Real-time FX rates** — Oracle integration

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
| CI/CD | GitHub Actions |
| Hosting | Vercel |
| Security | CSP, Rate Limiting, OWASP Validation |

---

## Traction

| Metric | Value |
|--------|-------|
| Smart Contracts Deployed | 2 (Escrow + Oracle) |
| Contract Tests | 8/8 passing |
| Frontend Tests | 26/26 passing |
| Testnet Wallets Onboarded | 50+ |
| On-chain Transactions | 20+ |
| Corridors Supported | 5 (US→PH, US→MX, EUR→BR, US→NG, EUR→IN) |
| CI/CD | Green pipeline |

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
| Open Source | ✅ | ✅ | ✅ |

---

## Growth Strategy

1. **InstaAward ($5K)** → Mainnet deployment + security audit
2. **Anchor Partnerships** → Onboard 3-5 Stellar anchors
3. **SCF Build Award ($50K)** → Scale to 1000+ users
4. **Revenue Model** → 0.1% settlement fee per transaction
5. **Geographic Expansion** → APAC + LATAM corridors

---

## Roadmap

| Phase | Timeline | Deliverables |
|-------|----------|-------------|
| **Now** | Month 1 | Green Belt complete, 50+ users |
| **Next** | Month 2 | Mainnet deploy, security audit, InstaAward |
| **Soon** | Month 3 | Mercury events, USDC support, Anchor SDK |
| **Later** | Month 6 | Mobile app, passkey auth, 1000+ users |

---

## Why Stellar?

- **Purpose-built** for cross-border payments
- **SEP-31** standard for anchors
- **SAC tokens** for regulated stablecoins
- **Soroban** for programmable settlement
- **Sub-cent fees** for financial inclusion
- **Growing ecosystem** with SCF funding

---

## The Ask

**InstaAward: $5,000 in XLM**

To fund:
- Mainnet deployment
- Security audit
- Anchor partner onboarding
- User growth to 50+

**SCF Build Award: $50,000 in XLM** (future)

---

## Team

**Subheeksh Koma** — Solo Builder

- Full-stack development (Rust + TypeScript + React)
- Soroban smart contracts
- Stellar SDK integration
- Deployed end-to-end from contracts to production UI

---

## Links

- **Live Demo:** https://anchorfx.vercel.app
- **GitHub:** https://github.com/subheeksh5599/AnchorFX
- **Contract:** CB4U7NLHDRGQQEKBNJ7GBPMXW4AA2VGTGEURS2FF34ZCRJMVOCFBKE26
- **Explorer:** https://stellar.expert/explorer/testnet/contract/CB4U7NL...
- **Demo Video:** https://youtu.be/FRRtzxk_aUs
