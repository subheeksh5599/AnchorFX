# AnchorFX

**Atomic cross-border FX settlement on Stellar.**

AnchorFX is an event-driven settlement platform built on Stellar testnet. It powers a multi-escrow system backed by an FX Rate Oracle — senders lock tokens, the oracle provides exchange rates, and settlement is triggered by contract events streamed in real-time. Cross-contract calls between the escrow factory and oracle enable trustless, atomic FX settlement between Stellar accounts.

**Live Demo:** [https://anchorfx.vercel.app](https://anchorfx.vercel.app)

---

## Submission Proof

| Item | Detail |
|---|---|
| **Contract Address** | `CB4U7NLHDRGQQEKBNJ7GBPMXW4AA2VGTGEURS2FF34ZCRJMVOCFBKE26` |
| **Contract Explorer** | [stellar.expert/.../CB4U7NLH...](https://stellar.expert/explorer/testnet/tx/0a275b8f653e7a51bd28ab7e59d1699bcc3c72d15fc54973a9ec076d4b86863e) |
| **Deployment TX** | `0a275b8f653e7a51bd28ab7e59d1699bcc3c72d15fc54973a9ec076d4b86863e` |
| **WASM Upload TX** | `353d42e6abe0da2e26fa4b1ebf1090812679445c8b8e4fead13d00b26463c85f` |
| **Interaction TX** | *Recorded in demo video — run `create()`, `settle()`, `refund()` on `/contract`* |
| **CI/CD** | [GitHub Actions](.github/workflows/ci.yml) — contract tests + frontend tests + build + lint |
| **Contract Tests** | 8 passing — `cargo test` (full flow, multi-escrow, refund, cancel, summaries, oracle update, duplicates, version) |
| **Frontend Tests** | 26 passing — `npm test` (validation, rate limiting, schema checks) |
| **Oracle Contract** | FX Rate Oracle with rate expiry (separate contract, cross-contract calls) |
| **Demo Video** | [docs/demo-video.webm](docs/demo-video.webm) — upload to YouTube/Loom and link here |
| **User Feedback** | [Google Form](https://forms.gle/YOUR_FORM_ID) — embedded on /contract page |

### Live URLs

| Route | URL |
|---|---|
| Landing | https://anchorfx.vercel.app |
| Wallet | https://anchorfx.vercel.app/wallet |
| Contract | https://anchorfx.vercel.app/contract |

---

## Project Structure

```
anchorfx/
├── .github/workflows/
│   └── ci.yml                         # CI/CD: contract tests + frontend build + lint
├── frontend/
│   ├── app/
│   │   ├── page.tsx                   # Landing page
│   │   ├── layout.tsx                 # Root layout with providers
│   │   ├── wallet/page.tsx            # Multi-wallet connect + balance + send XLM
│   │   ├── contract/page.tsx          # Deploy + read + real-time event stream
│   │   └── api/events/route.ts        # SSE endpoint for live contract events
│   ├── components/
│   │   ├── wallet-provider.tsx        # React context for multi-wallet state
│   │   ├── providers.tsx              # Theme + smooth scroll + wallet providers
│   │   └── hero.tsx, features.tsx, how-it-works.tsx, header.tsx, footer.tsx
│   └── lib/
│       ├── multi-wallet.ts            # Freighter + xBull wallet adapter
│       ├── contract-client.ts         # Contract deploy, SSE subscribe, escrow read
│       ├── stellar.ts                 # Stellar SDK helpers
│       └── config.ts                  # Site configuration
└── contracts/
    └── anchorfx-escrow/
        ├── Cargo.toml
        └── src/
            └── lib.rs                 # Escrow contract + 5 unit tests

---

## Setup Instructions

### Prerequisites

- **Node.js v22** (required — Node 25 has SWC binary incompatibility with Next.js 16)
- **npm**
- **Rust** with `wasm32-unknown-unknown` target (for Soroban contract)
- **Freighter browser extension** ([freighter.app](https://freighter.app)) set to **Testnet**

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The `/wallet` route provides the wallet demo.

### Soroban Contract

```bash
cd contracts/anchorfx-escrow

# Build for WASM
cargo build --target wasm32-unknown-unknown --release

# Run tests (unit tests simulate full escrow lifecycle)
cargo test
```

### Deployment (testnet)

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/anchorfx_escrow.wasm \
  --source <YOUR_KEY> \
  --network testnet
```

---

## Wallet Flow

1. Open `/wallet`
2. Click **Connect Freighter** — approve the connection in Freighter
3. Your public key and **XLM balance** are displayed
4. If balance is 0, use [Friendbot](https://laboratory.stellar.org/#account-creator?network=test) to fund your testnet account
5. Enter a destination address and XLM amount, click **Send XLM**
6. Freighter prompts you to sign — approve
7. Success: green card with transaction hash (links to Stellar Expert)
8. Failure: red card with error message

---

## Soroban Contract API

```rust
// Initialize with admin address
fn init(env: Env, admin: Address);

// Create escrow (sender locks tokens in contract)
fn create(env: Env, sender: Address, receiver: Address, token: Address,
          amount: i128, timeout_blocks: u32);

// Admin settles (releases funds to receiver)
fn settle(env: Env);

// Sender refunds after timeout
fn refund(env: Env);

// View current escrow state
fn get_escrow(env: Env) -> Option<Escrow>;
```

### Escrow Status States
- `Created` — Funds locked, pending settlement
- `Settled` — Admin released funds to receiver
- `Refunded` — Sender reclaimed after timeout

---

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS v4, Framer Motion, React Three Fiber
- **Stellar**: `@stellar/stellar-sdk` v16, `@stellar/freighter-api`
- **Smart Contracts**: Rust, Soroban SDK v22, WASM

---

## Screenshots

### Mobile Responsive — Wallet Page (iPhone X)
![Mobile Wallet](docs/mobile-wallet.png)

### Mobile Responsive — Contract Page (iPhone X)
![Mobile Contract](docs/mobile-contract.png)

### Desktop — Landing Page
![Desktop Landing](docs/desktop-landing.png)

### Wallet Connected — Freighter Popup & Balance
![Wallet Popup](docs/walletpopup.png)

### Wallet Dashboard — Public Key, Balance, Send Form
![Wallet Show](docs/walletshow.png)

### Transaction Confirmation — Success Card with TX Hash
![Confirmation](docs/confirmation.png)

### CI/CD Pipeline — GitHub Actions
![CI/CD Pipeline](docs/ci-pipeline.png)

### Smart Contract Tests — 8 Passing
![Test Output](docs/test-output.png)

---

## Green Belt — Production MVP

### User Onboarding
AnchorFX collects user feedback via a Google Form embedded on the `/contract` page. Each user submits their Stellar wallet address, email, experience rating (1-5), and optional feedback. All responses are exported to an Excel sheet linked below.

- **Google Form Link**: [Submit Feedback](https://forms.gle/YOUR_FORM_ID)
- **User Data Sheet**: *Export responses from Google Form and link here*
- **Target**: 10+ users for Green Belt, 50+ for Blue Belt

### Product Quality
- Production deployed on Vercel with auto-deploy from GitHub
- Mobile responsive (tested at 375px iPhone X)
- Error handling for all states (loading, empty, error, success)
- Rate limiting on API endpoints (30 burst, 2 req/s)
- Input validation on all user inputs (Stellar addresses, amounts, contract IDs)
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options)

### Roadmap & Improvements
Based on collected user feedback, planned improvements:
1. **Mercury event streaming** — replace SSE polling with production-grade event indexing
2. **Passkey smart accounts** — CAP-0051 biometric auth for institutional users
3. **Multi-corridor support** — USD→PHP, EUR→BRL, USDC→NGN
4. **Anchor SDK** — self-service integration for new anchor operators

### Technical Architecture
```
User Browser
    │
    ├── Next.js Frontend (Vercel)
    │   ├── /wallet — Connect Freighter/xBull, send XLM
    │   ├── /contract — Deploy escrow, read state, real-time events
    │   └── /api/events — SSE endpoint for contract event streaming
    │
    ├── Stellar Testnet
    │   ├── AnchorFX Escrow Contract — Multi-escrow factory + FX Oracle
    │   ├── AnchorFX Oracle Contract — FX rates with expiry
    │   └── Horizon + Soroban RPC — Transaction submission + queries
    │
    └── GitHub Actions
        └── CI/CD — cargo test → npm ci → npm test → next build
```

## License

MIT
