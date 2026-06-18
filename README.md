# AnchorFX

**Atomic cross-border FX settlement on Stellar.**

AnchorFX is a Level 1 (White Belt) and Level 2 (Yellow Belt) submission for the Stellar Journey to Mastery builder program. It demonstrates wallet connection, multi-wallet support, XLM transactions, and Soroban smart contract deployment on Stellar testnet.

**Live Demo:** [https://frontend-ruby-tau-69.vercel.app](https://frontend-ruby-tau-69.vercel.app)

| Route | URL |
|---|---|
| Landing | https://frontend-ruby-tau-69.vercel.app |
| Wallet | https://frontend-ruby-tau-69.vercel.app/wallet |
| Contract | https://frontend-ruby-tau-69.vercel.app/contract |

---

## Project Structure

```
anchorfx/
├── frontend/                    # Next.js 16 app (landing page + wallet demo)
│   ├── app/
│   │   ├── page.tsx            # Landing page
│   │   ├── layout.tsx          # Root layout with providers
│   │   └── wallet/
│   │       └── page.tsx        # Wallet connect + balance + send XLM
│   ├── components/
│   │   ├── wallet-provider.tsx # React context for Stellar wallet state
│   │   ├── providers.tsx       # Theme + smooth scroll + wallet providers
│   │   ├── hero.tsx, features.tsx, how-it-works.tsx, etc.
│   │   └── header.tsx, footer.tsx
│   └── lib/
│       ├── stellar.ts          # Freighter API + Stellar SDK helpers
│       ├── config.ts           # Site configuration (AnchorFX branding)
│       └── metadata.ts         # SEO metadata
└── contracts/
    └── anchorfx-escrow/        # Soroban escrow contract (Rust)
        ├── Cargo.toml
        └── src/
            └── lib.rs          # Escrow: create, settle, refund, get_escrow
```

---

## White Belt Requirements

| Requirement | Implementation |
|---|---|
| Freighter wallet on Testnet | Connected via `@stellar/freighter-api` |
| Wallet connect/disconnect | `connectWallet()` / `checkConnection()` functions |
| Fetch XLM balance | `getBalance()` via Horizon testnet API |
| Display balance in UI | Rendered on `/wallet` page with refresh button |
| Send XLM transaction | `sendXLM()` via Horizon + Freighter signing |
| Show success/failure | Green success card with tx hash + Stellar Expert link; red error card |
| Public GitHub repo | This repository |

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

*Add screenshots after running the app:*

1. **Wallet Connected State** — Freighter connected, showing public key
2. **Balance Displayed** — XLM balance visible on the wallet card
3. **Successful Testnet Transaction** — Green card with transaction hash and Stellar Expert link
4. **Transaction Result** — Clear success/failure feedback in the UI

---

## Belt Progression Plan

| Belt | Planned Feature |
|---|---|
| White | Wallet connect, balance, send XLM ✓ |
| Yellow | Multi-wallet integration, contract event sync via Mercury |
| Orange | Full AnchorFX escrow dApp with contract deployment |
| Green | Production-ready MVP with testnet escrow flow |
| Blue | User onboarding (50+), feedback-driven improvements |
| Black | Mainnet launch, security audits, 30+ users |

---

## License

MIT
