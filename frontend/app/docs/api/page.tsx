import type { Metadata } from "next";
import Link from "next/link";
import { createMetadata } from "@/lib/metadata";
import { Callout, CodeBlock, DefRow } from "@/components/docs";
import type { ReactNode } from "react";

export const metadata: Metadata = createMetadata({
  title: "API Reference",
  description:
    "AnchorFX API documentation — public REST + SSE endpoints for escrows, rates, analytics, audit, health, export, and fee sponsorship.",
  path: "/docs/api",
});

export default function ApiDocsPage(): ReactNode {
  return (
    <div>
      <div className="mb-2 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
        Documentation / API Reference
      </div>
      <h1 className="mb-6 text-3xl font-bold tracking-[-0.03em] uppercase">
        API Reference
      </h1>
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-neutral-400">
        AnchorFX exposes a public, read-only REST + SSE API for escrow data, FX
        rates, analytics, and audit — plus an authenticated fee-sponsorship
        endpoint for gasless settlement. The interactive reference lives at the{" "}
        <Link className="text-neutral-200 underline" href="/developers">
          live API Reference page
        </Link>
        .
      </p>

      <CodeBlock title="Base URL">{`https://anchorfx.vercel.app`}</CodeBlock>

      <h2 className="mt-12 mb-4 text-2xl font-bold tracking-[-0.02em]">
        Endpoints
      </h2>
      <DefRow term="GET /api/escrows">
        List all escrows (optional ?contract= override).
      </DefRow>
      <DefRow term="GET /api/rates">
        Live FX rates (optional ?oracle= override).
      </DefRow>
      <DefRow term="GET /api/fxroute">
        Quote a corridor: ?from=US&to=PH&amount=1000.
      </DefRow>
      <DefRow term="GET /api/analytics">
        On-chain analytics by escrow status + volume.
      </DefRow>
      <DefRow term="GET /api/health">RPC + contract health check.</DefRow>
      <DefRow term="GET /api/audit">Audit trail of contract events.</DefRow>
      <DefRow term="GET /api/events">
        Server-Sent Events stream of live events.
      </DefRow>
      <DefRow term="GET /api/export">Export all escrows as CSV or JSON.</DefRow>
      <DefRow term="POST /api/sponsor">
        Fee sponsorship — pay network fee for gasless users.
      </DefRow>
      <DefRow term="GET /api/feedback">
        In-app product feedback (session-scoped).
      </DefRow>

      <h2 className="mt-12 mb-4 text-2xl font-bold tracking-[-0.02em]">
        Example
      </h2>
      <CodeBlock title="curl — live escrows">{`curl -s https://anchorfx.vercel.app/api/escrows | jq
{
  "escrows": [{ "id": 1, "sender": "G...", "status": "Settled" }],
  "count": 71
}`}</CodeBlock>

      <Callout variant="info" title="Rate-limited">
        All public endpoints are rate-limited per IP and validated against the
        on-chain contract.
      </Callout>
    </div>
  );
}
