# AnchorFX — Frontend

Atomic cross-border FX settlement on Stellar. Next.js 16 + React 19 + TypeScript.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Requires [Freighter browser extension](https://freighter.app) set to Stellar Testnet.

## Environment

Copy `.env.example` to `.env.local` and configure:

```
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_NETWORK=TESTNET
NEXT_PUBLIC_ADMIN_PUBLIC_KEY=G...
CONTRACT_ID=CB4U7NL...
```

## Project Structure

```
frontend/
├── app/
│   ├── page.tsx                 # Landing page
│   ├── layout.tsx               # Root layout + providers
│   ├── error.tsx                # Error boundary
│   ├── loading.tsx              # Loading state
│   ├── wallet/page.tsx          # Multi-wallet connect + send XLM
│   ├── contract/page.tsx        # Deploy + read escrow + event stream
│   ├── anchors/page.tsx         # Escrow lifecycle UI + FX discovery
│   ├── admin/page.tsx           # Admin dashboard + analytics + health
│   └── api/
│       ├── events/route.ts      # SSE endpoint for contract event streaming
│       ├── feedback/route.ts    # User feedback collection
│       ├── fxroute/route.ts     # FX corridor route discovery
│       ├── export/route.ts      # CSV/JSON escrow export
│       ├── sep31/receive/route.ts  # SEP-31 receive endpoint
│       ├── sep31/transaction/route.ts # SEP-31 transaction status
│       ├── escrows/route.ts     # Escrow data relay
│       ├── analytics/route.ts   # Usage analytics
│       ├── audit/route.ts       # Escrow audit trail
│       ├── health/route.ts      # System health check
│       └── reputation/route.ts  # Anchor reputation scores
├── components/
│   ├── wallet-provider.tsx      # React context for multi-wallet state
│   ├── providers.tsx            # Theme + smooth scroll + wallet providers
│   ├── header.tsx               # Navigation + mobile menu
│   ├── footer.tsx               # Site footer
│   ├── hero.tsx                 # Landing hero with CTA
│   ├── features.tsx             # Feature grid on landing
│   ├── how-it-works.tsx         # Escrow lifecycle explanation
│   ├── testimonials.tsx         # User testimonials
│   ├── pricing.tsx             # Pricing tiers
│   ├── faq.tsx                  # FAQ accordion
│   ├── skip-to-content.tsx      # Accessibility skip link
│   ├── theme-toggle.tsx         # Dark/light mode toggle
│   └── rotating-cards.tsx       # Animated feature cards
├── lib/
│   ├── multi-wallet.ts          # Freighter + xBull wallet adapter
│   ├── contract-client.ts       # Contract deploy, invoke, SSE subscribe
│   ├── relay.ts                 # RPC data relay for escrow + analytics
│   ├── env.ts                   # Centralized environment config
│   ├── validation.ts            # Stellar address + amount validation
│   ├── rate-limit.ts            # Request rate limiting
│   ├── metadata.ts              # Page metadata helpers
│   └── config.ts                # Site configuration
└── __tests__/
    ├── rate-limit.test.ts       # Rate limit unit tests
    └── validation.test.ts       # Validation unit tests
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run test` | Run unit tests (vitest) |
| `npm run format:check` | Check formatting (prettier) |
| `npx eslint . --quiet` | Lint source files |
| `npx tsc --noEmit` | Type check |

## Testing

26 tests covering validation schema checks, rate limiting, Stellar address validation, and input sanitization. Contract integration tests run separately via `cargo test` in the contracts directory.
