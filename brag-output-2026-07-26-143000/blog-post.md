# Building Atomic Cross-Border Settlement on Stellar: The AnchorFX Story

**A technical deep-dive into Soroban escrow contracts, FX oracles, and mainnet deployment — from testnet prototype to production.**

---

## The Problem

Cross-border payments still take 3-5 days and cost 6.5% on average. Correspondent banking chains are slow, opaque, and expensive. The $800B remittance market has no atomic settlement layer.

Stellar was purpose-built for this. 5-second finality. Built-in DEX. Path payments at the protocol level. And now, with Soroban smart contracts, programmable settlement.

AnchorFX is an open-source protocol that combines these primitives into trustless, atomic FX settlement between regulated financial anchors. Two Soroban contracts — an Escrow Factory and an FX Rate Oracle — communicate via cross-contract calls to lock, rate, and settle funds in a single atomic flow.

---

## Architecture

```
Sender → [Escrow Contract] → Receiver
              │
         [Oracle Contract]
              │
         FX Rate Data
```

### Contract 1: Escrow Factory (995 lines, 23 tests)

The escrow contract is a multi-escrow factory with per-escrow storage. Each escrow goes through a defined lifecycle:

- **Created** — Sender locks tokens with a timeout and settlement conditions
- **CounterpartyApproved** — Receiver signs off on the terms
- **Settled** — Admin releases funds at the locked FX rate
- **Refunded** — Sender reclaims after timeout expires
- **Cancelled** — Admin cancels (circuit breaker)

```rust
pub fn create_escrow(
    env: Env,
    sender: Address,
    receiver: Address,
    token: Address,
    amount: i128,
    timeout_blocks: u32,
    corridor: u32,
) -> u64 {
    sender.require_auth();
    // Read oracle rate at creation time — locks the rate
    let oracle_addr = env.storage().instance().get(&ORACLE_KEY).unwrap();
    let rate: u64 = env.invoke_contract(&oracle_addr, &symbol_short!("get_rate"), ...);
    // Store escrow with locked rate
    // ...
}
```

Key security decisions:
- **Per-escrow storage** — O(1) reads, independent TTL per escrow
- **Checks-effects-interactions** — state saved before token transfer in all 4 mutation functions
- **require_auth() on init** — prevents front-running
- **Pause/unpause** — emergency circuit breaker
- **Typed errors** — no raw `panic!` anywhere

### Contract 2: FX Rate Oracle (195 lines, 4 tests)

The oracle stores per-token FX rates with 24-hour expiry. Rates are set by admin and validated on every read:

```rust
pub fn get_rate(env: Env, token: Address) -> u64 {
    let rate_data: RateData = env.storage().instance()
        .get(&token)
        .unwrap_or_else(|| panic_with_error!(&env, Error::RateNotFound));
    
    // Check expiry (~24h in ledgers)
    if env.ledger().sequence() > rate_data.expires_at {
        panic_with_error!(&env, Error::RateExpired);
    }
    rate_data.rate
}
```

### Cross-Contract Communication

The escrow reads the oracle rate at creation time and locks it. This means:

1. Rate is **locked at escrow creation** — no slippage between creation and settlement
2. Oracle can **update rates independently** — existing escrows use their locked rate
3. Both contracts have **independent admin** — oracle admin ≠ escrow admin if desired

---

## The Frontend

Next.js 16 + React 19 + Tailwind CSS v4. Five routes:

| Route | Purpose |
|-------|---------|
| `/` | Landing page with animated hero, features, stats |
| `/wallet` | Freighter/xBull connect, balance, send XLM |
| `/contract` | Deploy contracts, real-time SSE event stream |
| `/anchors` | Escrow management dashboard |
| `/admin` | Analytics, health monitoring, admin controls |

10 API routes handle REST + SSE + SEP-31 stubs. All rate-limited (30 burst, 2 req/s). Input validation on every endpoint.

---

## Audit & Security

Full security audit: **257 findings**. All critical, high, and medium issues fixed before mainnet.

Key mitigations:
- Per-escrow storage (eliminates single-TTL data wipe risk)
- Checks-effects-interactions ordering
- Input validation with typed errors
- Production security headers: HSTS, CSP, COOP, CORP
- CI fails on lint/format/tsc warnings

---

## Mainnet Deployment

Deployed on Stellar mainnet with 6 verified transactions:

| Contract | Address |
|----------|---------|
| Oracle | `CCOIG4R7AIUQTP5CURK4PFINFF2EVQTBGTCN636E2JY25FGY7L4K54KT` |
| Escrow | `CDGQ7K4XGAPG3YJVAGHCE45XOR63HLD6ARJCRESEEKSRQZSIRAKG6F6V` |

Lessons from mainnet deploy:
- **WASM upload cost scales with size** — 4KB oracle: ~1 XLM. 13KB escrow: ~18 XLM. Optimize aggressively.
- **Mainnet RPC can be unreliable** — add retries with exponential backoff, use multiple RPC endpoints
- **Fee estimation matters** — always `simulateTransaction` first, use the suggested fee
- **Sequence numbers** — horizon and RPC can desync. Always reload account before building

---

## Testing

```
Contract Tests:    27 (23 escrow + 4 oracle)
Frontend Tests:    26 (vitest)
Total:             53 passing, zero warnings
```

Test coverage includes:
- Full escrow lifecycle (create → approve → settle → refund → cancel)
- Multi-escrow isolation (two escrows don't interfere)
- FX rate math (denominator precision, overflow protection)
- Fuzz testing (50 random escrow operations)
- Rate limiting, schema validation, error states

---

## What I Learned

1. **Soroban's storage model is different** — per-key TTL means you can't store everything in one map. Per-escrow storage with independent lifetimes is the right pattern.

2. **Cross-contract calls are powerful but have overhead** — plan your gas budget. Reading oracle rates at creation time and caching them is cheaper than live reads at settlement.

3. **Mainnet is not testnet** — fees are real, RPC is slower, and WASM upload costs will surprise you. Simulate everything. Budget 3x what testnet costs.

4. **Security-first from day one** — the audit found 257 issues in code that "felt solid." Get audited. Fix everything.

---

## Open Source

AnchorFX is MIT licensed. Contracts, frontend, deploy scripts, and tests are all public.

**GitHub:** [github.com/subheeksh5599/AnchorFX](https://github.com/subheeksh5599/AnchorFX)
**Live:** [anchorfx.vercel.app](https://anchorfx.vercel.app)
**Twitter:** [@Tenki_ai](https://x.com/Tenki_ai)

Built for the Stellar Journey to Mastery — Black Belt track. Stellar, Soroban SDK v22, Rust WASM, Next.js 16.
