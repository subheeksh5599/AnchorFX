import type { Metadata } from "next";
import { createMetadata } from "@/lib/metadata";
import { SectionHeading, DefRow, Callout } from "@/components/docs";
import type { ReactNode } from "react";

export const metadata: Metadata = createMetadata({
  title: "Security",
  description:
    "AnchorFX security documentation — audit summary, contract hardening, invariants, and responsible disclosure.",
  path: "/docs/security",
});

export default function SecurityDocsPage(): ReactNode {
  return (
    <div>
      <div className="mb-2 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
        Documentation / Security
      </div>
      <h1 className="mb-6 text-3xl font-bold tracking-[-0.03em] uppercase">
        Security
      </h1>

      <SectionHeading index="01">Audit summary</SectionHeading>
      <p className="mb-4 max-w-2xl text-sm leading-relaxed text-neutral-400">
        The smart contracts were audited (257 findings). All critical, high, and
        medium issues were fixed and verified. The full responsible-disclosure
        policy and audit report live in the repository.
      </p>
      <DefRow term="Audit findings">
        257 identified — critical/high/medium all fixed; informational remain
        documented.
      </DefRow>
      <DefRow term="Deliverable">
        <a
          className="text-neutral-200 underline"
          href="https://raw.githubusercontent.com/subheeksh5599/AnchorFX/main/docs/SECURITY.md"
          target="_blank"
          rel="noreferrer"
        >
          docs/SECURITY.md
        </a>{" "}
        (committed, self-review submitted as the security deliverable)
      </DefRow>

      <SectionHeading index="02">Contract hardening</SectionHeading>
      <DefRow term="Per-escrow storage">
        Per-key TTL with O(1) reads; escrows no longer collide on a single slot.
      </DefRow>
      <DefRow term="Checks-effects-interactions">
        Ordering enforced in all mutation functions.
      </DefRow>
      <DefRow term="Typed errors">
        Input validation with typed errors — no panics.
      </DefRow>
      <DefRow term="Circuit breaker">
        pause()/unpause() admin control over the protocol.
      </DefRow>
      <DefRow term="Front-running guard">require_auth() on init().</DefRow>
      <DefRow term="Rate integrity">
        create_escrow reverts on invalid/expired oracle rates.
      </DefRow>

      <SectionHeading index="03">Frontend hardening</SectionHeading>
      <DefRow term="Security headers">
        HSTS, CSP, COOP, CORP in production.
      </DefRow>
      <DefRow term="Input validation">
        Typed validation for Stellar addresses and amounts.
      </DefRow>
      <DefRow term="CI hardening">
        tsc + clippy + prettier fail on warnings; 61 tests zero-warning.
      </DefRow>

      <Callout variant="warning" title="Responsible disclosure">
        Report vulnerabilities privately via{" "}
        <a
          className="text-neutral-200 underline"
          href="mailto:komasubheeksh@gmail.com"
        >
          komasubheeksh@gmail.com
        </a>{" "}
        — full policy in docs/SECURITY.md.
      </Callout>
    </div>
  );
}
