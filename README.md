# AnchorFX

**Atomic cross-border FX settlement on Stellar — now on Mainnet.**

AnchorFX enables trustless, atomic FX settlement between regulated financial anchors on the Stellar network. Built with Soroban smart contracts (Escrow Factory + FX Rate Oracle) and Stellar DEX path payments.

**Live:** [https://anchorfx.vercel.app](https://anchorfx.vercel.app)

---

## ⚫ Black Belt — Mainnet Launch

> Deployed on Stellar Mainnet with real users, contract audit, ecosystem promotion, and community contribution.

### Mainnet Contracts

| Contract | Address |
|----------|---------|
| **Oracle** | `CCOIG4R7AIUQTP5CURK4PFINFF2EVQTBGTCN636E2JY25FGY7L4K54KT` |
| **Escrow** | `CDGQ7K4XGAPG3YJVAGHCE45XOR63HLD6ARJCRESEEKSRQZSIRAKG6F6V` |
| **Deployer** | `GDHMIQXJITKCXJ5IREK4MUEJKLSZVA6XKBF25WKVN3REC6OMMNENYSK5` |

### Mainnet Deployment Proof

| Step | TX Hash | Explorer |
|------|---------|----------|
| Oracle upload | `280e994b...` | [stellar.expert](https://stellar.expert/explorer/public/tx/280e994bc2e565086f519860b66e4324cdae204214ff7442d017215178fc841b) |
| Oracle deploy | `2b5b563d...` | [stellar.expert](https://stellar.expert/explorer/public/tx/2b5b563d6e4b0a8d1bc7912afd41352ab8c3cbcef8096cb477bb212a599898a7) |
| Oracle init | `8ea195f0...` | [stellar.expert](https://stellar.expert/explorer/public/tx/8ea195f047c26bdefe3d49955347a602427a6ce5a7399c3288b8f78f7f33de52) |
| Escrow upload | `da86d4a7...` | [stellar.expert](https://stellar.expert/explorer/public/tx/da86d4a7bd2ef37aa67b24f44935665a40bad067f2284580204fde3d33249d90) |
| Escrow deploy | `4917db90...` | [stellar.expert](https://stellar.expert/explorer/public/tx/4917db909d407cf305da5f59290b9de86ba5093e7e744df70abaeca4645ac181) |
| Escrow init | `a238c3a1...` | [stellar.expert](https://stellar.expert/explorer/public/tx/a238c3a116922cdaedd4d7dceffd94ad2060908787d39e6794b57f2e1ef90fc1) |

### Black Belt Checklist

- [x] Mainnet contract deployment (oracle + escrow)
- [ ] 20+ verified mainnet users (5 complete, 15 pending — mainnet RPC congestion, see [proof](frontend/20-users-mainnet-proof.txt))
- [x] Smart contract audit — 257 findings, all critical/high/medium fixed ([SECURITY.md](docs/SECURITY.md))
- [x] Twitter/X launch post with demo ([@Tenki_ai](https://x.com/Tenki_ai/status/2081345430995308770))
- [x] Community contribution — [dev.to blog](https://dev.to/komari_subheeksh_ced2cb4c/building-atomic-cross-border-settlement-on-stellar-8io)
- [x] 30+ meaningful commits
- [x] Advanced feature: fee sponsorship ([code](frontend/app/api/sponsor/route.ts) + [client](frontend/lib/sponsor.ts))
- [x] Full technical documentation

---

## User Onboarding — Google Form

**Feedback Form:** [https://forms.gle/...](https://docs.google.com/forms/d/e/1FAIpQLSeulA6BSWpbVZBUvv9egWKxTbr_aGe5dNy0AqyDBNH3xqSSjQ/viewform)

> Collects: wallet address, email, name, product rating (1-5), and feedback.
> Requirements for Black Belt: 20+ verified mainnet users.
> Export responses to Excel and link the sheet here.

### User Feedback Excel Export

**Excel Sheet:** `docs/user-feedback-mainnet.xlsx` (to be added after collecting 20+ responses)

### Future Improvements (Based on User Feedback)

> This section will be updated after collecting feedback from the 20 mainnet users.
> Each improvement will include a git commit link showing the implementation.

| # | Improvement | User Source | Commit |
|---|-------------|-------------|--------|
| 1 | TBD | TBD | TBD |
| 2 | TBD | TBD | TBD |
| 3 | TBD | TBD | TBD |

---

## Live URLs

| Route | URL |
|-------|-----|
| Landing | https://anchorfx.vercel.app |
| Wallet | https://anchorfx.vercel.app/wallet |
| Contract | https://anchorfx.vercel.app/contract |
| Anchors | https://anchorfx.vercel.app/anchors |
| Admin | https://anchorfx.vercel.app/admin |

---

## Project Structure

```
AnchorFX/
├── .github/workflows/
│   └── ci.yml                              # CI/CD: contracts + frontend tests + build + lint
├── frontend/
│   ├── app/
│   │   ├── page.tsx                        # Landing page
│   │   ├── layout.tsx                      # Root layout
│   │   ├── wallet/page.tsx                 # Multi-wallet connect + balance + send
│   │   ├── contract/page.tsx               # Deploy + read + SSE event stream
│   │   ├── anchors/page.tsx                # Escrow management dashboard
│   │   ├── admin/page.tsx                  # Admin analytics + controls
│   │   └── api/                            # 10 API routes (REST + SSE)
│   ├── components/
│   │   ├── wallet-provider.tsx             # React context for multi-wallet state
│   │   ├── providers.tsx                   # Theme + scroll + wallet providers
│   │   ├── hero.tsx                        # Landing hero with 3D animations
│   │   ├── features.tsx, how-it-works.tsx, stats.tsx, testimonials.tsx
│   │   ├── pricing.tsx, faq.tsx, final-cta.tsx
│   │   └── header.tsx, footer.tsx          # Network-aware header/footer
│   ├── lib/
│   │   ├── contract-client.ts              # Full escrow lifecycle + oracle calls
│   │   ├── multi-wallet.ts                 # Freighter + xBull adapter
│   │   ├── env.ts                          # Network configuration (testnet/mainnet)
│   │   ├── validation.ts, rate-limit.ts    # Input validation + API protection
│   │   └── metadata.ts, config.ts          # SEO + site config
│   ├── deploy.cjs                          # Universal deploy script (testnet + mainnet)
│   ├── vercel.json                         # Vercel framework config
│   └── next.config.ts                      # CSP + security headers
└── contracts/
    ├── anchorfx-escrow/
    │   ├── Cargo.toml
    │   └── src/lib.rs                      # 995 lines, 23 tests, multi-escrow factory
    └── anchorfx-oracle/
        ├── Cargo.toml
        └── src/lib.rs                      # 195 lines, 4 tests, FX rate oracle
```

---

## Setup

### Prerequisites
- **Node.js v22+**
- **Rust** with `wasm32-unknown-unknown` target
- **Freighter** or **xBull** browser extension

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # edit for mainnet/testnet
npm run dev
```

Open http://localhost:3000

### Soroban Contracts

```bash
cd contracts/anchorfx-escrow
cargo build --target wasm32-unknown-unknown --release
cargo test

cd ../anchorfx-oracle
cargo build --target wasm32-unknown-unknown --release
cargo test
```

### Deployment

```bash
# Testnet
cd frontend
node deploy.cjs <TESTNET_SECRET_KEY>

# Mainnet
node deploy.cjs <MAINNET_SECRET_KEY> --mainnet
```

---

## Soroban Contract API

### Escrow Contract

```rust
// Initialize (admin only, one-time)
fn init(env: Env, admin: Address, oracle: Address);

// Create escrow → returns escrow ID
fn create_escrow(env: Env, sender: Address, receiver: Address,
                  token: Address, amount: i128, timeout_blocks: u32, corridor: u32) -> u64;

// Receiver approves
fn counterparty_approve(env: Env, escrow_id: u64);

// Admin settles (releases funds to receiver)
fn settle(env: Env, escrow_id: u64);

// Sender refunds after timeout
fn refund(env: Env, escrow_id: u64);

// Admin cancels
fn cancel(env: Env, escrow_id: u64);

// Read state
fn get_escrow(env: Env, escrow_id: u64) -> Option<Escrow>;
fn escrow_count(env: Env) -> u64;
fn list_escrows(env: Env, start: u64, limit: u64) -> Vec<u64>;

// Admin controls
fn pause(env: Env);
fn unpause(env: Env);
fn transfer_admin(env: Env, new_admin: Address);
```

### Oracle Contract

```rust
fn init(env: Env, admin: Address);
fn set_rate(env: Env, token: Address, rate: u64);
fn get_rate(env: Env, token: Address) -> u64;
fn is_rate_valid(env: Env, token: Address) -> bool;
fn remove_rate(env: Env, token: Address);
fn transfer_admin(env: Env, new_admin: Address);
```

### Escrow States
- `Created` — Funds locked, awaiting counterparty approval
- `CounterpartyApproved` — Both parties agreed, ready to settle
- `Settled` — Admin released funds to receiver
- `Refunded` — Sender reclaimed after timeout
- `Cancelled` — Admin cancelled

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4, Framer Motion, Three.js |
| Blockchain | Stellar, Soroban SDK v22, Rust WASM |
| Wallets | Freighter, xBull |
| Infra | Vercel, GitHub Actions CI, Stellar RPC + Horizon |
| Testing | Vitest (frontend), Cargo test (contracts), Playwright (e2e) |

---

## Security — Post-Audit

Full security audit (257 findings) — all critical, high, and medium issues fixed.

- Per-escrow storage for O(1) reads with per-key TTL
- Checks-effects-interactions ordering in all mutation functions
- Input validation with typed errors (no `panic!`)
- Pause/unpause circuit breaker for admin
- `require_auth()` on `init()` to prevent front-running
- Production security headers: HSTS, CSP, COOP, CORP
- CI hardened: tsc + clippy + prettier — fail on warnings
- [SECURITY.md](docs/SECURITY.md) — responsible disclosure policy

---

## Traction

| Metric | Value |
|--------|-------|
| Smart Contracts | 2 (Escrow + Oracle) |
| Networks | Testnet + Mainnet |
| Contract Tests | 27 (23 escrow + 4 oracle) |
| Frontend Tests | 26 |
| **Total Tests** | **53 passing, zero warnings** |
| Audit Findings | 257 → all critical/high/medium fixed |
| Mainnet Deploy TXs | 6 verified |
| API Routes | 10 (REST + SSE + SEP-31) |
| License | MIT |

---

## Escrow Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│  Sender  │────▶│  Escrow      │────▶│ Receiver │
│ locks    │     │  (Soroban)   │     │ gets     │
│ funds    │     │              │     │ tokens   │
└──────────┘     │  1. create   │     └──────────┘
                 │  2. approve  │
┌──────────┐     │  3. settle   │     ┌──────────┐
│  Oracle  │────▶│  (FX rate)   │◀────│  Admin   │
│ provides │     │              │     │ triggers │
│ FX rate  │     └──────────────┘     │ settle   │
└──────────┘                          └──────────┘
```

---

## Community Contribution ✅

- [x] **Technical blog**: "Building Atomic Cross-Border Settlement on Stellar"
- **Link:** [dev.to/komari_subheeksh_ced2cb4c/building-atomic-cross-border-settlement-on-stellar-8io](https://dev.to/komari_subheeksh_ced2cb4c/building-atomic-cross-border-settlement-on-stellar-8io)

---

## Advanced Feature

> At least one required for Black Belt:

- [x] **Fee Sponsorship** — Gasless transactions using fee bump operations ([`/api/sponsor`](frontend/app/api/sponsor/route.ts))
- [ ] **Cross-border Flows** — SEP-24/SEP-31 anchor integration (stubs exist in `/api/sep31/`)
- [ ] **Multi-signature Logic** — Multi-party approval for settlement
- [ ] **Account Abstraction** — Smart wallet with custom auth (CAP-0051)

---

## License

MIT
