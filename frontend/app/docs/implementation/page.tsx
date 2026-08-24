import type { Metadata } from "next";
import { createMetadata } from "@/lib/metadata";
import { SectionHeading, CodeBlock, DefRow, Callout } from "@/components/docs";
import type { ReactNode } from "react";

export const metadata: Metadata = createMetadata({
  title: "Implementation",
  description:
    "AnchorFX implementation documentation — system architecture, Soroban contract API, escrow state machine, and project structure.",
  path: "/docs/implementation",
});

export default function ImplementationPage(): ReactNode {
  return (
    <div>
      <div className="mb-2 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
        Documentation / Implementation
      </div>
      <h1 className="mb-6 text-3xl font-bold tracking-[-0.03em] uppercase">
        Implementation
      </h1>

      <SectionHeading index="01">System architecture</SectionHeading>
      <p className="mb-4 max-w-2xl text-sm leading-relaxed text-neutral-400">
        AnchorFX is a full-stack settlement layer: two Soroban smart contracts
        on Stellar, a Next.js frontend, and a thin API layer that reads on-chain
        state and exposes it over REST and SSE.
      </p>
      <CodeBlock title="Architecture">{`┌──────────────┐     ┌────────────────┐
│  Frontend    │──┐  │   Next.js API   │
│  (Next.js)   │  │  │  (REST + SSE)   │
└──────────────┘  │  └───────┬────────┘
                  │          │
                  │   ┌──────▼────────┐
                  └──>│  Soroban RPC  │
                      └──────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
      ┌────────────┐ ┌────────────┐ ┌─────────────┐
      │  Escrow    │ │ FX Oracle  │ │  Any SAC    │
      │  factory   │ │ (rates)    │ │  (XLM/USDC) │
      └────────────┘ └────────────┘ └─────────────┘`}</CodeBlock>
      <Callout variant="info" title="Atomicity">
        The escrow contract stores the FX rate at creation time; the locked
        funds cannot be released until both parties approve, and settlement is
        atomic.
      </Callout>

      <SectionHeading index="02">Escrow contract API</SectionHeading>
      <DefRow term="init(admin, oracle)">
        Initialize the contract with an admin and an oracle address.
      </DefRow>
      <DefRow term="create_escrow(sender, receiver, token, amount, timeout_blocks, corridor)">
        Create a new escrow locking funds for a corridor at the current valid
        oracle rate.
      </DefRow>
      <DefRow term="counterparty_approve(id)">
        Receiver approves the escrow terms (second-party confirmation).
      </DefRow>
      <DefRow term="settle(id)">
        Admin releases funds to the receiver at the agreed rate.
      </DefRow>
      <DefRow term="refund(id)">
        Sender reclaims funds after the timeout when unapproved.
      </DefRow>
      <DefRow term="cancel(id)">Admin cancels a stuck escrow.</DefRow>
      <DefRow term="get_escrow(id) / escrow_count() / list_escrows(start, limit)">
        Read escrow state and paginate the escrow list.
      </DefRow>
      <DefRow term="pause() / unpause() / transfer_admin(new_admin)">
        Circuit breaker and admin transfer.
      </DefRow>

      <SectionHeading index="03">Oracle contract API</SectionHeading>
      <DefRow term="init(admin)">Initialize the oracle.</DefRow>
      <DefRow term="set_rate(token, rate) / get_rate(token)">
        Publish and read a rate; <code>get_rate</code> reverts if expired.
      </DefRow>
      <DefRow term="is_rate_valid(token) / remove_rate(token)">
        Check validity and remove a rate.
      </DefRow>

      <SectionHeading index="04">Escrow states</SectionHeading>
      <CodeBlock title="State machine">{`Created ──────────────> CounterpartyApproved ──> Settled
  │                              │
  ├─> Refunded (after timeout)   └─> Cancelled (admin)
  └─> Cancelled (admin)`}</CodeBlock>

      <SectionHeading index="05">Project structure</SectionHeading>
      <CodeBlock title="Repo layout">{`AnchorFX/
├── contracts/
│   ├── anchorfx-escrow/            # Escrow factory (23 tests)
│   └── anchorfx-oracle/            # FX rate oracle (4 tests)
├── frontend/
│   ├── app/                        # Next.js routes + API
│   │   ├── wallet/ contract/ anchors/
│   │   ├── explorer/ rates/ status/ developers/ admin/
│   │   └── api/                    # 15 REST + SSE routes
│   ├── components/ lib/ scripts/
│   └── deploy.cjs                  # Universal deploy script
├── docs/                           # Pitch deck, screenshots, security, CSV
└── GROWTH-REPORT.md                # Monthly growth report`}</CodeBlock>

      <SectionHeading index="06">Security review</SectionHeading>
      <p className="text-sm leading-relaxed text-neutral-400">
        The contracts were audited (257 findings — all critical/high/medium
        fixed) and hardened with per-escrow storage, checks-effects-interactions
        ordering, typed errors, and a pause circuit breaker. See the full{" "}
        <a
          className="text-neutral-200 underline"
          href="https://raw.githubusercontent.com/subheeksh5599/AnchorFX/main/docs/SECURITY.md"
          target="_blank"
          rel="noreferrer"
        >
          Security documentation
        </a>
        .
      </p>
    </div>
  );
}
