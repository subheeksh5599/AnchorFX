# AnchorFX Security Specification & Threat Model

## 1. System Overview

AnchorFX is a multi-sig escrow system with embedded FX oracle on Stellar's Soroban platform.

**Components:**
- `anchorfx-escrow` — Multi-escrow factory with FX rate application at settlement
- `anchorfx-oracle` — Per-token FX rate storage with 24h expiry
- Next.js frontend with wallet integration and SSE event streaming

**Trust Model:**
- **Admin**: Can settle, cancel, update oracle. Must be authorized.
- **Sender**: Creates escrow, deposits tokens. Can refund after timeout.
- **Receiver**: Approves settlement terms. Receives rate-adjusted payout.
- **Oracle**: Provides FX rates. Separate contract. Rates expire after ~24h.

## 2. Mathematical Invariants (Proven by Test Suite)

| # | Invariant | Test | Status |
|---|-----------|------|--------|
| I-1 | `escrow_count()` never decreases | `invariant_escrow_count_never_decreases` | ✅ |
| I-2 | Counter increments by exactly 1 per create | `invariant_counter_always_increments` | ✅ |
| I-3 | `settle()` only succeeds if `status == CounterpartyApproved` | Enforced by `assert!()` + `test_settle_without_approval_fails` | ✅ |
| I-4 | `refund()` only succeeds after timeout | `assert!(ledger >= timeout_ledger)` + `test_refund_before_timeout_fails` | ✅ |
| I-5 | Double settle always fails | `invariant_double_settle_always_fails` | ✅ |
| I-6 | Settled escrows cannot transition | `invariant_settled_escrow_cannot_be_refunded` | ✅ |
| I-7 | Cancelled escrows cannot transition | `invariant_cancelled_escrow_cannot_change_state` | ✅ |
| I-8 | Receiver gets exactly `source × fx_rate / 100000` | `invariant_sender_pays_receiver_receives_after_settle` | ✅ |
| I-9 | `init()` can only be called once | `if .get(&ADMIN_KEY).is_some()` guard | ✅ |
| I-10 | Any valid corridor ID (1-5) is accepted | `property_valid_corridor_range_accepted` | ✅ |

## 3. Threat Model

### T-1: Unauthorized Settlement
**Threat**: Non-admin tries to settle an escrow.
**Mitigation**: `admin.require_auth()` — only the stored admin address can call settle.
**Residual Risk**: If admin key is compromised, attacker can settle all escrows.

### T-2: Premature Refund
**Threat**: Sender refunds before timeout.
**Mitigation**: `assert!(env.ledger().sequence() >= escrow.timeout_ledger)` enforces timeout.
**Residual Risk**: None — timeout is enforced at the protocol level.

### T-3: Bypass Counterparty Approval
**Threat**: Admin settles without receiver approval.
**Mitigation**: `settle()` requires `EscrowStatus::CounterpartyApproved`. `counterparty_approve()` requires `receiver.require_auth()`.
**Residual Risk**: If admin and receiver collude or admin == receiver.

### T-4: Oracle Rate Manipulation
**Threat**: Admin sets absurd FX rates.
**Mitigation**: Rate expiry (24h ~17280 ledgers). No rate bounds yet (H-02 in audit).
**Residual Risk**: Within 24h window, admin can manipulate rates. Mitigation planned: multi-sig admin + rate change bounds.

### T-5: Re-initialization Attack
**Threat**: Attacker re-calls init() post-deployment to overwrite admin.
**Mitigation**: `init()` checks `if admin_key.is_some()` and panics if already set.
**Residual Risk**: None — re-init is impossible.

### T-6: Reentrancy
**Threat**: Malicious token contract re-enters escrow during transfer.
**Mitigation**: Soroban host environment uses a single-threaded WASM VM — reentrancy is impossible at the VM level. Additionally, state is updated before transfers (checks-effects-interactions principle).
**Residual Risk**: None — Soroban's architecture prevents reentrancy.

### T-7: Frontend Auth Bypass
**Threat**: API endpoints called without rate limiting or with invalid contract IDs.
**Mitigation**: All endpoints use `rateLimit()` and `validateContractId()`. Health endpoint fixed in audit (W-02/W-06).
**Residual Risk**: None for validated endpoints.

### T-8: SSE Connection Exhaustion
**Threat**: Attacker opens thousands of SSE connections.
**Mitigation**: 5-minute auto-close, abort signal cleanup, rate limiting on connection initiation.
**Residual Risk**: Moderate — no global connection counter (stateless serverless).

## 4. Audit History

| Date | Auditor | Findings | Status |
|------|---------|----------|--------|
| 2026-06-20 | Quantum Dev (external review) | 17 findings (C-01, C-02, H-01 to H-04, M-01 to M-04, L-01 to L-04, 5 informational) | All critical/high fixed. Mediums fixed. Lows documented. |
| 2026-06-20 | Internal security review | 13 additional findings (W-01 to W-13) | All critical/high fixed. |

## 5. Attack Surface Map

```
┌─────────────────────────────────────────┐
│              External Attack Surface     │
│                                         │
│  Browser ──→ Vercel Frontend            │
│             │ ├─ /api/* (rate limited)  │
│             │ ├─ SSE /api/events        │
│             │ └─ CSP headers            │
│             │                           │
│             └─→ Soroban RPC             │
│                 ├─ Escrow Contract      │
│                 │  ├─ init() [guard]    │
│                 │  ├─ create_escrow()   │
│                 │  ├─ counterparty_..() │
│                 │  ├─ settle() [FX math]│
│                 │  ├─ refund() [timeout]│
│                 │  └─ cancel() [admin]  │
│                 │                       │
│                 └─ Oracle Contract      │
│                    ├─ init() [guard]    │
│                    ├─ set_rate() [admin]│
│                    └─ get_rate()        │
└─────────────────────────────────────────┘
```

## 6. Remaining Risks (Post-Fix)

| ID | Risk | Severity | Plan |
|----|------|----------|------|
| H-02 | Oracle single admin, no rate bounds | HIGH | Multi-sig admin + rate change limits (v2) |
| M-01 | fx_rate not used if not configured | LOW | Already demo-ready with testnet oracle |
| W-04 | CSP `unsafe-inline` | MEDIUM | Next.js 16 limitation — requires nonce pattern |
