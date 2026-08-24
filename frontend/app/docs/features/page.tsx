import type { Metadata } from "next";
import { createMetadata } from "@/lib/metadata";
import { SectionHeading, Tag, DefRow } from "@/components/docs";
import type { ReactNode } from "react";

export const metadata: Metadata = createMetadata({
  title: "Features",
  description:
    "AnchorFX feature documentation — multi-wallet support, Soroban escrow, FX oracle, corridors, explorer, fee sponsorship, and more.",
  path: "/docs/features",
});

const API_FEATURES = [
  [
    "REST + SSE API",
    "Public read endpoints for escrows, rates, analytics, audit, health, export — plus live Server-Sent Events.",
  ],
  [
    "Fee sponsorship",
    "Gasless settlement: submit an XDR and AnchorFX pays the network fee via fee bump.",
  ],
  [
    "Feedbacks endpoint",
    "In-app feedback capture wired to monthly growth reporting.",
  ],
  [
    "SEP-31 receive",
    "Anchor receive + transaction endpoints for cross-border flows integration.",
  ],
  ["Reputation", "Per-address reputation tracking for compliance."],
] as const;

export default function FeaturesPage(): ReactNode {
  return (
    <div>
      <div className="mb-2 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
        Documentation / Features
      </div>
      <h1 className="mb-6 text-3xl font-bold tracking-[-0.03em] uppercase">
        Features
      </h1>

      <SectionHeading index="01">App</SectionHeading>
      <DefRow term="Multi-wallet connect">
        Connect <strong className="text-neutral-200">Freighter</strong> or{" "}
        <strong className="text-neutral-200">xBull</strong> to read your
        balance, sign transactions, and interact with the escrow contract from
        the browser.
      </DefRow>
      <DefRow term="Escrow management">
        Create, approve, settle, refund, and cancel escrows from a single
        dashboard, with live transaction-status tracking (pending / success /
        fail).
      </DefRow>
      <DefRow term="Contract explorer">
        Deploy and read the contract, plus a live SSE event stream of on-chain
        events.
      </DefRow>
      <DefRow term="Public escrow explorer">
        Browse all on-chain escrows and their state without connecting a wallet.
      </DefRow>
      <DefRow term="Live FX rates">
        Real-time FX rates published by the on-chain oracle, readable per
        corridor.
      </DefRow>
      <DefRow term="Network status">
        Health + analytics dashboard for the contract and RPC, with live mainnet
        stats.
      </DefRow>
      <DefRow term="Admin controls">
        Admin analytics, settle/cancel controls, and protocol pause (circuit
        breaker).
      </DefRow>

      <SectionHeading index="02">Contracts</SectionHeading>
      <DefRow term="Escrow factory">
        Holds funds and enforces the settlement state machine with per-escrow
        storage, O(1) reads, and per-key TTL.
      </DefRow>
      <DefRow term="FX oracle">
        Publishes and expires rates on-chain; `create_escrow` reverts on an
        invalid or expired rate, guaranteeing settlement integrity.
      </DefRow>
      <DefRow term="Any SAC token">
        Escrow any Stellar Asset Contract token — XLM, USDC, EURC — not just the
        native asset.
      </DefRow>
      <DefRow term="Corridor routing">
        11 cross-border corridors (US→PH, US→MX, EUR→BR, US→NG, EUR→IN, US→AR,
        US→GH, US→KE, US→ID, US→VN, US→TH) mapped to Stellar DEX path payments.
      </DefRow>

      <SectionHeading index="03">Developer API</SectionHeading>
      <p className="mb-4 text-sm text-neutral-400">
        A public, read-only REST + SSE API for institutions and integrators,
        plus an authenticated fee-sponsorship endpoint for gasless users.
      </p>
      <div className="mb-6 space-y-0 border border-neutral-800">
        {API_FEATURES.map(([name, desc]) => (
          <DefRow key={name} term={name}>
            {desc}
          </DefRow>
        ))}
      </div>

      <div className="mt-10 border border-neutral-800 p-4">
        <div className="mb-2 text-[10px] font-bold tracking-[0.3em] text-neutral-500 uppercase">
          Toggle summary
        </div>
        <div className="flex flex-wrap gap-2">
          <Tag>Multi-wallet</Tag>
          <Tag>Soroban escrow</Tag>
          <Tag>FX oracle</Tag>
          <Tag>11 corridors</Tag>
          <Tag>Fee sponsorship</Tag>
          <Tag>SSE events</Tag>
          <Tag>REST API</Tag>
          <Tag>Analytics</Tag>
          <Tag>Mobile responsive</Tag>
          <Tag>Dark mode</Tag>
        </div>
      </div>
    </div>
  );
}
