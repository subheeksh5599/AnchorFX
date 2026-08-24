import type { Metadata } from "next";
import { createMetadata } from "@/lib/metadata";
import { Callout, SectionHeading, CodeBlock } from "@/components/docs";
import type { ReactNode } from "react";

export const metadata: Metadata = createMetadata({
  title: "User Guide",
  description:
    "AnchorFX user guide — how to connect a wallet, create an escrow, approve, settle, refund, and explore on-chain activity.",
  path: "/docs/usage",
});

export default function UsagePage(): ReactNode {
  return (
    <div>
      <div className="mb-2 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
        Documentation / User Guide
      </div>
      <h1 className="mb-6 text-3xl font-bold tracking-[-0.03em] uppercase">
        User Guide
      </h1>

      <SectionHeading index="01">Connect a wallet</SectionHeading>
      <ol className="ml-5 list-decimal space-y-2 text-[13px] leading-relaxed text-neutral-400">
        <li>
          Install <strong className="text-neutral-200">Freighter</strong> or{" "}
          <strong className="text-neutral-200">xBull</strong> from its official
          store page.
        </li>
        <li>
          Open the AnchorFX app and go to the{" "}
          <strong className="text-neutral-200">Wallet</strong> page.
        </li>
        <li>Choose your wallet provider and approve the connection request.</li>
        <li>
          Your public address and XLM balance appear. You are now ready to use
          the app.
        </li>
      </ol>

      <SectionHeading index="02">Create an escrow</SectionHeading>
      <p className="mb-3 text-sm text-neutral-400">
        An escrow locks funds on-chain for a corridor, referencing the FX rate
        published by the oracle.
      </p>
      <ol className="ml-5 list-decimal space-y-2 text-[13px] leading-relaxed text-neutral-400">
        <li>
          Go to the <strong className="text-neutral-200">Settlement</strong>{" "}
          page.
        </li>
        <li>Select the sender and receiver addresses.</li>
        <li>
          Choose the token and amount, and pick a corridor (e.g. US → PH).
        </li>
        <li>
          Review the quoted FX rate and confirm. Your wallet signs the
          transaction.
        </li>
        <li>
          The escrow is created with a{" "}
          <strong className="text-neutral-200">Created</strong> status and the
          transaction is tracked live.
        </li>
      </ol>
      <Callout variant="info" title="Rate validity">
        The FX rate is only valid while the oracle rate is fresh. If the rate
        expires before the escrow is created, the contract reverts and you must
        refresh the rate.
      </Callout>

      <SectionHeading index="03">Approve (receiver)</SectionHeading>
      <p className="mb-3 text-sm text-neutral-400">
        The receiver must approve the escrow terms before it can settle. This is
        the second-party confirmation that makes settlement atomic and
        non-repudiable.
      </p>
      <ol className="ml-5 list-decimal space-y-2 text-[13px] leading-relaxed text-neutral-400">
        <li>
          From the Settlement dashboard, select the escrow awaiting approval.
        </li>
        <li>Review the amount, corridor, and rate.</li>
        <li>
          Sign the{" "}
          <strong className="text-neutral-200">CounterpartyApproved</strong>{" "}
          transaction.
        </li>
      </ol>

      <SectionHeading index="04">Settle</SectionHeading>
      <p className="mb-3 text-sm text-neutral-400">
        An authorized admin settles the escrow to release funds to the receiver
        at the agreed rate. Settlement is final and written on-chain.
      </p>
      <CodeBlock title="Escrow states after action">{`Created ─ approve ─> CounterpartyApproved ─ settle ─> Settled
Created ─ timeout ─> Refunded
Created ─ admin ─> Cancelled`}</CodeBlock>

      <SectionHeading index="05">Refund & cancel</SectionHeading>
      <p className="mb-3 text-sm text-neutral-400">
        If the receiver never approves, the sender can{" "}
        <strong className="text-neutral-200">refund</strong> after the timeout
        and reclaim their locked funds. An admin can{" "}
        <strong className="text-neutral-200">cancel</strong> a stuck escrow or
        pause the whole protocol via the circuit breaker.
      </p>

      <SectionHeading index="06">Explore on-chain activity</SectionHeading>
      <p className="mb-3 text-sm text-neutral-400">
        No wallet? Use the public explorer and live rates pages:
      </p>
      <ul className="mb-4 ml-5 list-disc space-y-2 text-[13px] text-neutral-400">
        <li>
          <code className="text-neutral-200">/explorer</code> — browse all
          escrows and their status.
        </li>
        <li>
          <code className="text-neutral-200">/rates</code> — live oracle FX
          rates.
        </li>
        <li>
          <code className="text-neutral-200">/status</code> — network + contract
          health and analytics.
        </li>
        <li>
          <code className="text-neutral-200">/developers</code> — public API
          reference.
        </li>
      </ul>

      <Callout variant="success" title="Gasless users">
        AnchorFX supports fee sponsorship: submit an XDR to{" "}
        <code className="text-neutral-200">/api/sponsor</code> and AnchorFX pays
        the network fee, letting non-crypto users settle without holding XLM.
      </Callout>
    </div>
  );
}
