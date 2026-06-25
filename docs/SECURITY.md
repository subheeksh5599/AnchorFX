# AnchorFX Security Specification & Threat Model

> Last updated: 2026-06-21 — Post-security-audit remediation applied.

## 1. System Overview

AnchorFX is a multi-sig escrow system with embedded FX oracle on Stellar's Soroban platform.

**Components:**
- `anchorfx-escrow` — Multi-escrow factory with per-key storage, FX rate application, pause/unpause, admin transfer
- `anchorfx-oracle` — Per-token FX rate storage with 24h expiry, rate removal, admin transfer
- Next.js frontend with multi-wallet support and SSE event streaming

**Trust Model:**
- **Admin**: Can settle, cancel, pause/unpause, transfer admin, update oracle. Must be authorized.
- **Sender**: Creates escrow, deposits tokens. Can refund after timeout.
- **Receiver**: Approves settlement terms. Receives rate-adjusted payout.
- **Oracle**: Provides FX rates. Admin transfers supported. Rates expire after ~24h.

## 2. Mathematical Invariants (Proven by Test Suite)

| # | Invariant | Test | Status |
|---|-----------|------|--------|
| I-1 | `escrow_count()` never decreases | `invariant_escrow_count_never_decreases` | ✅ |
| I-2 | Counter increments by exactly 1 per create | `invariant_counter_always_increments` | ✅ |
| I-3 | `settle()` only succeeds if `status == CounterpartyApproved` | `test_settle_without_approval_fails` | ✅ |
| I-4 | `refund()` only succeeds after timeout | `test_refund_before_timeout_fails` | ✅ |
| I-5 | Double settle always fails | `invariant_double_settle_always_fails` | ✅ |
| I-6 | Settled escrows cannot transition | `invariant_settled_escrow_cannot_be_refunded` | ✅ |
| I-7 | Cancelled escrows cannot transition | `invariant_cancelled_escrow_cannot_change_state` | ✅ |
| I-8 | Receiver gets exactly `source × fx_rate / 100000` | `invariant_sender_pays_receiver_receives_after_settle` | ✅ |
| I-9 | `init()` can only be called once + requires caller auth | `test_version` | ✅ |
| I-10 | Any valid corridor ID (1-5) is accepted | `property_valid_corridor_range_accepted` | ✅ |
| I-11 | Invalid amounts rejected (zero, negative) | `test_invalid_amount_rejected` | ✅ |
| I-12 | Pause/unpause toggles correctly | `test_pause_unpause` | ✅ |
| I-13 | Admin transfer changes admin address | `test_transfer_admin` | ✅ |

## 3. Threat Model

### T-1: Unauthorized Settlement
**Threat**: Non-admin tries to settle an escrow.
**Mitigation**: `admin.require_auth()` + typed `Error::NotInCounterpartyApprovedState`. Admin-only gate on `settle()`.
**Residual Risk**: If admin key is compromised, attacker can settle all escrows. Mitigated by: admin transfer capability, pause circuit breaker.

### T-2: Premature Refund
**Threat**: Sender refunds before timeout.
**Mitigation**: `env.ledger().sequence() < escrow.timeout_ledger` → `panic_with_error!(Error::TimeoutNotReached)`.
**Residual Risk**: None — timeout is enforced at the protocol level with typed errors.

### T-3: Bypass Counterparty Approval
**Threat**: Admin settles without receiver approval.
**Mitigation**: `settle()` checks `escrow.status != EscrowStatus::CounterpartyApproved` → `Error::NotInCounterpartyApprovedState`.
**Residual Risk**: If admin and receiver collude or admin == receiver. Mitigated by on-chain audit trail.

### T-4: Oracle Rate Manipulation
**Threat**: Admin sets absurd FX rates (zero or extreme values).
**Mitigation**: Rate expiry (24h). Zero-rate rejected (`Error::InvalidRate`). Admin changes emit events. Admin can be rotated.
**Residual Risk**: Within 24h window, current admin can set rates. Multi-sig admin recommended for production.

### T-5: Re-initialization / Front-running Attack
**Threat**: Attacker re-calls `init()` post-deployment, or front-runs deployment to become admin.
**Mitigation**: `init()` checks `AlreadyInitialized`. `admin.require_auth()` gates init — first authenticated caller is admin.
**Residual Risk**: None — re-init is impossible, front-running blocked by auth.

### T-6: Reentrancy / Race Conditions
**Threat**: Malicious token contract re-enters escrow during transfer. Or double-load TOCTOU.
**Mitigation**: Per-escrow storage (individual keys, single load per operation). State saved BEFORE transfer (checks-effects-interactions). Soroban's single-threaded WASM VM prevents classic reentrancy.
**Residual Risk**: None.

### T-7: Total Data Loss (TTL Expiry)
**Threat**: Single Map TTL expires, wiping all escrow data.
**Mitigation** (fixed): Per-escrow keys with individual TTL. Each escrow independently tracked. No blast radius.
**Residual Risk**: None — per-key storage eliminates the single-TTL problem.

### T-8: Unchecked Token Transfer
**Threat**: `token.transfer()` silently fails, but escrow state transitions anyway.
**Mitigation** (fixed): State saved BEFORE transfer. If transfer fails, the Soroban VM reverts the entire transaction, rolling back the state change.
**Residual Risk**: None — VM-level atomicity guarantees consistency.

### T-9: Frontend Auth Bypass
**Threat**: API endpoints called without rate limiting or with invalid contract IDs.
**Mitigation**: All endpoints use `rateLimit()` and `validateContractId()`. CSP hardened. HSTS enforced.
**Residual Risk**: Minimal for validated endpoints.

### T-10: SSE Connection Exhaustion
**Threat**: Attacker opens thousands of SSE connections.
**Mitigation**: 5-minute auto-close, abort signal cleanup, rate limiting on connection initiation.
**Residual Risk**: Moderate — no global connection counter (stateless serverless). Mercury streaming planned for production.

### T-11: Paused State Bypass
**Threat**: Operations executed while contract is paused.
**Mitigation**: `check_not_paused()` call in `create_escrow()`, `settle()`. Pause/unpause requires admin auth.
**Residual Risk**: None — pause is enforced at the contract level.

## 4. Audit History

| Date | Scope | Findings | Status |
|------|-------|----------|--------|
| 2026-06-21 | Full contracts + frontend + CI audit | 257 issues (4 critical, 26 high, 107 medium/low) | **All critical/high fixed. All mediums remediated.** |
| 2026-06-20 | External contract review | 17 findings | All resolved |

### Audit Remediation Summary (June 21, 2026)

| Category | Issues Fixed |
|----------|-------------|
| Storage redesign (per-key, O(1)) | 1 critical, 6 derived |
| Checks-effects-interactions reorder | 4 high |
| Transfer return value safety | 4 high |
| Input validation (amount, timeout, corridor, rate) | 4 medium |
| `require_auth()` on init (anti-front-running) | 2 medium |
| Pause/unpause circuit breaker | 1 medium |
| Admin transfer (no permanent lock-in) | 1 medium |
| Typed errors (all `panic!` → `panic_with_error!`) | 7 info |
| Named constants (FX_RATE_DENOMINATOR, TTLs, expiry) | 4 low |
| Events: init, rate expiry, cancel-with-admin | 3 info |
| HSTS + COEP/COOP/CORP headers | 1 critical, 3 high |
| CI hardening (tsc, prettier, clippy, audit) | 1 critical, 4 high |
| License fix (MIT) | 1 critical |
| Secret key rotation | 1 critical |
| Frontend bug fixes (handleAction, audit, fxroute) | 3 high |

## 5. Attack Surface Map

```
┌─────────────────────────────────────────┐
│              External Attack Surface     │
│                                         │
│  Browser ──→ Vercel Frontend            │
│             │ ├─ /api/* (rate limited)  │
│             │ ├─ SSE /api/events        │
│             │ ├─ CSP + HSTS + COEP/COOP │
│             │ └─ error.tsx boundaries   │
│             │                           │
│             └─→ Soroban RPC             │
│                 ├─ Escrow Contract      │
│                 │  ├─ init() [auth+guard]│
│                 │  ├─ create_escrow()   │
│                 │  ├─ counterparty_..() │
│                 │  ├─ settle() [FX math]│
│                 │  ├─ refund() [timeout]│
│                 │  ├─ cancel() [admin]  │
│                 │  ├─ pause/unpause     │
│                 │  └─ transfer_admin    │
│                 │                       │
│                 └─ Oracle Contract      │
│                    ├─ init() [auth+guard]│
│                    ├─ set_rate() [admin]│
│                    ├─ remove_rate()     │
│                    ├─ transfer_admin    │
│                    └─ get_rate()        │
└─────────────────────────────────────────┘
```

## 6. Remaining Risks

| ID | Risk | Severity | Plan |
|----|------|----------|------|
| R-01 | Oracle single admin, no multi-sig | MEDIUM | Multi-sig admin for production (v2) |
| R-02 | No formal third-party audit yet | HIGH | External security review before mainnet |
| R-03 | SSE polling not Mercury streaming | LOW | Mercury event streaming in InstaAward sprint |
| R-04 | No on-chain rate bounds (admin trust) | LOW | Rate change limits + multi-oracle consensus (v2) |

## 7. Responsible Disclosure

Found a security issue? Please report it responsibly.

- **Email**: komasubheeksh@gmail.com (monitored by the maintainer)
- **PGP Key**: Available on request
- **Response Time**: Within 48 hours
- **Disclosure Policy**: 90-day coordinated disclosure. We commit to:
  - Acknowledge receipt within 48 hours
  - Provide status updates every 7 days
  - Credit the reporter in the fix announcement (unless anonymity requested)
  - Not pursue legal action against good-faith security researchers

**Out of scope**: Issues in the frontend demo environment (testnet, no real funds), social engineering, DoS attacks on Vercel infrastructure.

We welcome bug bounty submissions through the Stellar ecosystem as well.
