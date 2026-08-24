import type { Metadata } from "next";
import Link from "next/link";
import { createMetadata } from "@/lib/metadata";
import { Callout, CodeBlock, Tag } from "@/components/docs";
import type { ReactNode } from "react";

export const metadata: Metadata = createMetadata({
  title: "Overview",
  description:
    "AnchorFX documentation overview — what AnchorFX is, how atomic FX settlement works, and what's live on Stellar mainnet.",
  path: "/docs",
});

const LINKS = [
  { href: "/docs/features", label: "Features", desc: "What AnchorFX offers" },
  { href: "/docs/usage", label: "User Guide", desc: "How to use the app" },
  { href: "/docs/setup", label: "Setup & Deployment", desc: "Run it yourself" },
  {
    href: "/docs/implementation",
    label: "Implementation",
    desc: "Architecture & contracts",
  },
  { href: "/docs/api", label: "API Reference", desc: "REST + SSE endpoints" },
  { href: "/docs/security", label: "Security", desc: "Audit & hardening" },
];

export default function DocsPage(): ReactNode {
  return (
    <div>
      <div className="mb-2 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
        Documentation
      </div>
      <h1 className="mb-4 text-4xl leading-[0.95] font-bold tracking-[-0.04em] uppercase">
        AnchorFX
      </h1>
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-neutral-400">
        AnchorFX is a non-custodial settlement layer for cross-border payments,
        built entirely on Stellar. A sender and a receiver lock funds in an
        on-chain escrow, agree on an FX rate published by a trusted oracle, and
        settle atomically — nobody can change the terms after the fact.
      </p>

      <div className="mb-8 flex flex-wrap gap-2">
        <Tag>Live on Mainnet</Tag>
        <Tag>Soroban Smart Contracts</Tag>
        <Tag>Atomic Settlement</Tag>
        <Tag>Open Source</Tag>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group border border-neutral-800 p-4 transition-colors hover:border-neutral-600"
          >
            <div className="group-hover:text-accent mb-1 text-sm font-semibold text-white">
              {l.label}
            </div>
            <div className="text-[12px] text-neutral-500">{l.desc}</div>
          </Link>
        ))}
      </div>

      <h2 className="mt-12 mb-4 text-2xl font-bold tracking-[-0.02em]">
        What AnchorFX solves
      </h2>
      <p className="mb-4 max-w-2xl text-sm leading-relaxed text-neutral-400">
        Correspondent banking for cross-border payments is slow, opaque, and
        expensive. AnchorFX replaces it with an auditable, atomic on-chain
        primitive: funds are locked programmatically, both parties must agree on
        the rate, and settlement is final in seconds. It is designed for
        regulated financial anchors, fintechs, and P2P payment corridors.
      </p>

      <h2 className="mt-10 mb-4 text-2xl font-bold tracking-[-0.02em]">
        Core primitive
      </h2>
      <p className="mb-4 max-w-2xl text-sm leading-relaxed text-neutral-400">
        The escrow lifecycle has five states:
      </p>
      <CodeBlock title="Escrow lifecycle">{`Created
  └─> CounterpartyApproved ─> Settled
  └─> Refunded (after timeout)
  └─> Cancelled (admin)`}</CodeBlock>
      <ol className="mb-4 ml-5 list-decimal space-y-2 text-[13px] leading-relaxed text-neutral-400">
        <li>
          Sender creates an escrow, locking any SAC token for a corridor and
          referencing the oracle FX rate.
        </li>
        <li>Receiver approves — both parties now agree on the terms.</li>
        <li>
          Admin settles — funds release to the receiver at the agreed rate.
        </li>
        <li>
          If the receiver never approves, the sender refunds after the timeout.
        </li>
        <li>
          Admin can pause the protocol (circuit breaker) or cancel a stuck
          escrow.
        </li>
      </ol>

      <h2 className="mt-10 mb-4 text-2xl font-bold tracking-[-0.02em]">
        Live on Stellar mainnet
      </h2>
      <CodeBlock title="Deployed contracts">{`Escrow   CDGQ7K4XGAPG3YJVAGHCE45XOR63HLD6ARJCRESEEKSRQZSIRAKG6F6V
Oracle   CCOIG4R7AIUQTP5CURK4PFINFF2EVQTBGTCN636E2JY25FGY7L4K54KT
Admin    GDHMIQXJITKCXJ5IREK4MUEJKLSZVA6XKBF25WKVN3REC6OMMNENYSK5`}</CodeBlock>
      <Callout variant="success" title="Prod app">
        Production application:{" "}
        <a
          className="text-neutral-200 underline"
          href="https://anchorfx.vercel.app"
          target="_blank"
          rel="noreferrer"
        >
          https://anchorfx.vercel.app
        </a>
      </Callout>
    </div>
  );
}
