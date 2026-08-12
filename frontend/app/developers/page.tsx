import type { Metadata } from "next";
import Link from "next/link";
import { createMetadata } from "@/lib/metadata";
import type { ReactNode } from "react";

export const metadata: Metadata = createMetadata({
  title: "API Reference",
  description:
    "AnchorFX public API reference — escrows, FX routes, events, analytics, audit, health.",
  path: "/developers",
});

interface Endpoint {
  method: "GET" | "POST";
  path: string;
  description: string;
  params: string[];
  example: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/escrows",
    description:
      "List all escrows from the on-chain contract. Accepts an optional ?contract= override.",
    params: ["contract (optional)"],
    example: "/api/escrows",
  },
  {
    method: "GET",
    path: "/api/rates",
    description:
      "Live FX rates published on the oracle contract. Accepts an optional ?oracle= override.",
    params: ["oracle (optional)"],
    example: "/api/rates",
  },
  {
    method: "GET",
    path: "/api/fxroute",
    description:
      "Quote a cross-border route: estimated receive amount, fee, and settlement path.",
    params: ["from", "to", "amount"],
    example: "/api/fxroute?from=US&to=PH&amount=1000",
  },
  {
    method: "GET",
    path: "/api/analytics",
    description:
      "Aggregated on-chain analytics: escrow counts by status, total volume, events.",
    params: ["contract (optional)"],
    example: "/api/analytics",
  },
  {
    method: "GET",
    path: "/api/health",
    description:
      "Health check for the RPC endpoint and escrow contract.",
    params: ["contract (optional)"],
    example: "/api/health",
  },
  {
    method: "GET",
    path: "/api/audit",
    description:
      "Audit trail of contract events for compliance and record-keeping.",
    params: ["contract (optional)"],
    example: "/api/audit",
  },
  {
    method: "GET",
    path: "/api/events",
    description:
      "Server-Sent Events stream of live contract events (escrow created, settled, etc.).",
    params: ["contract (optional)"],
    example: "/api/events?contract=<CONTRACT_ID>",
  },
  {
    method: "GET",
    path: "/api/export",
    description:
      "Export all escrows as CSV or JSON for record-keeping and analysis.",
    params: ["format=csv|json"],
    example: "/api/export?format=csv",
  },
  {
    method: "POST",
    path: "/api/sponsor",
    description:
      "Fee sponsorship — submit a transaction XDR and AnchorFX pays the network fee (gasless users).",
    params: ["xdr (body)"],
    example: "POST /api/sponsor  { \"xdr\": \"AAAA...\" }",
  },
  {
    method: "GET",
    path: "/api/feedback",
    description:
      "In-memory product feedback captured from the in-app widget (session-scoped).",
    params: [],
    example: "/api/feedback",
  },
];

function MethodBadge({ method }: { method: "GET" | "POST" }): ReactNode {
  return (
    <span
      className={`inline-block w-14 border px-2 py-0.5 text-center text-[10px] font-bold tracking-[0.2em] ${
        method === "GET"
          ? "border-green-400/40 text-green-400"
          : "border-blue-400/40 text-blue-400"
      }`}
    >
      {method}
    </span>
  );
}

export default function DevelopersPage(): ReactNode {
  return (
    <main id="main" className="min-h-screen bg-black font-mono text-white">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-5 py-16">
        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <h1 className="mb-3 text-[2.5rem] leading-[0.9] font-bold tracking-[-0.04em] uppercase">
              API Reference
            </h1>
            <div className="text-xs tracking-[0.3em] text-neutral-500 uppercase">
              Public REST + SSE endpoints
            </div>
          </div>
          <div className="flex items-end gap-4">
            <Link
              href="/explorer"
              className="border-b border-neutral-800 pb-1 text-[10px] tracking-[0.2em] text-neutral-400 uppercase transition-colors hover:border-red-400 hover:text-red-400"
            >
              Explorer
            </Link>
            <Link
              href="/status"
              className="border-b border-neutral-800 pb-1 text-[10px] tracking-[0.2em] text-neutral-400 uppercase transition-colors hover:border-red-400 hover:text-red-400"
            >
              Status
            </Link>
          </div>
        </div>

        <hr className="mb-8 border-neutral-800" />

        <p className="mb-8 max-w-2xl text-sm text-neutral-400">
          AnchorFX exposes a public, read-only REST API for escrow data, FX
          rates, analytics, and audit records — plus an authenticated fee
          sponsorship endpoint for gasless settlement. All endpoints are
          rate-limited per IP and validated against the on-chain contract.
        </p>

        <div className="mb-8 space-y-4">
          {ENDPOINTS.map((ep) => (
            <div key={ep.path} className="border border-neutral-800">
              <div className="flex flex-wrap items-center gap-3 border-b border-neutral-800 p-4">
                <MethodBadge method={ep.method} />
                <code className="text-sm text-neutral-200">{ep.path}</code>
                <span className="ml-auto text-[10px] text-neutral-600">
                  {ep.params.join(" · ") || "no params"}
                </span>
              </div>
              <div className="p-4">
                <p className="mb-3 text-xs text-neutral-400">
                  {ep.description}
                </p>
                <div className="border border-neutral-900 bg-neutral-950 p-3">
                  <code className="text-[11px] text-neutral-500">
                    {ep.example}
                  </code>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-8 border border-neutral-800 p-5">
          <h3 className="mb-3 text-xs font-bold tracking-[0.3em] text-neutral-400 uppercase">
            Example — Escrow Lookup
          </h3>
          <pre className="overflow-x-auto border border-neutral-900 bg-neutral-950 p-4 text-[11px] leading-relaxed text-neutral-500">
{`curl -s https://anchorfx.vercel.app/api/escrows | jq
{
  "escrows": [
    {
      "id": 1,
      "sender": "G...",
      "receiver": "G...",
      "token": "C...",
      "amount": "1000",
      "fxRate": 56400,
      "corridor": 1,
      "status": "Settled"
    }
  ],
  "count": 1
}`}
          </pre>
        </div>

        <div className="mt-20 text-center">
          <Link
            href="/"
            className="text-[10px] tracking-[0.3em] text-neutral-700 uppercase transition-colors hover:text-neutral-500"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
