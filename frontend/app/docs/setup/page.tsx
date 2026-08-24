import type { Metadata } from "next";
import { createMetadata } from "@/lib/metadata";
import { Callout, SectionHeading, CodeBlock } from "@/components/docs";
import type { ReactNode } from "react";

export const metadata: Metadata = createMetadata({
  title: "Setup & Deployment",
  description:
    "AnchorFX setup and deployment documentation — prerequisites, frontend install, Soroban contract build, testnet and mainnet deployment.",
  path: "/docs/setup",
});

export default function SetupPage(): ReactNode {
  return (
    <div>
      <div className="mb-2 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
        Documentation / Setup &amp; Deployment
      </div>
      <h1 className="mb-6 text-3xl font-bold tracking-[-0.03em] uppercase">
        Setup &amp; Deployment
      </h1>

      <SectionHeading index="01">Prerequisites</SectionHeading>
      <ul className="ml-5 list-disc space-y-2 text-[13px] text-neutral-400">
        <li>
          <strong className="text-neutral-200">Node.js v22+</strong>
        </li>
        <li>
          <strong className="text-neutral-200">Rust</strong> with the{" "}
          <code className="text-neutral-200">wasm32-unknown-unknown</code>{" "}
          target
        </li>
        <li>
          <strong className="text-neutral-200">Freighter</strong> or{" "}
          <strong className="text-neutral-200">xBull</strong> browser extension
        </li>
        <li>
          <strong className="text-neutral-200">stellar CLI</strong> for contract
          deployment
        </li>
      </ul>

      <SectionHeading index="02">Frontend</SectionHeading>
      <CodeBlock title="Install & run locally">{`cd frontend
npm install
cp .env.example .env.local   # edit for mainnet/testnet
npm run dev`}</CodeBlock>
      <p className="text-sm text-neutral-400">
        Open <code className="text-neutral-200">http://localhost:3000</code>.
      </p>

      <SectionHeading index="03">Soroban contracts</SectionHeading>
      <CodeBlock title="Build & test">{`cd contracts/anchorfx-escrow
cargo build --target wasm32-unknown-unknown --release
cargo test

cd ../anchorfx-oracle
cargo build --target wasm32-unknown-unknown --release
cargo test`}</CodeBlock>

      <SectionHeading index="04">Deployment</SectionHeading>
      <CodeBlock title="Testnet">{`cd frontend
node deploy.cjs <TESTNET_SECRET_KEY>`}</CodeBlock>
      <CodeBlock title="Mainnet">{`cd frontend
node deploy.cjs <MAINNET_SECRET_KEY> --mainnet`}</CodeBlock>
      <CodeBlock title="Frontend (Vercel)">{`vercel --prod`}</CodeBlock>
      <Callout variant="info" title="Contract addresses">
        Deployed addresses are written to{" "}
        <code className="text-neutral-200">.env.&lt;net&gt;.contracts</code> and
        documented in the README &amp; growth report. Mainnet escrow &amp;
        oracle addresses are in the Overview page.
      </Callout>

      <SectionHeading index="05">CI / CD</SectionHeading>
      <p className="mb-3 text-sm text-neutral-400">
        GitHub Actions runs the contract tests, WASM release build, formatting,
        clippy, frontend build, test, typecheck, eslint, and prettier on every
        push. Vercel auto-deploys production on push to{" "}
        <code className="text-neutral-200">main</code>.
      </p>
      <ul className="ml-5 list-disc space-y-2 text-[13px] text-neutral-400">
        <li>
          Contract tests: <code className="text-neutral-200">cargo test</code>{" "}
          (escrow + oracle), WASM release build,{" "}
          <code className="text-neutral-200">cargo fmt --check</code>,{" "}
          <code className="text-neutral-200">clippy -D warnings</code>
        </li>
        <li>
          Frontend: <code className="text-neutral-200">npm ci</code>,{" "}
          <code className="text-neutral-200">next build</code>, vitest,{" "}
          <code className="text-neutral-200">tsc --noEmit</code>, eslint,
          prettier
        </li>
        <li>61 tests total (27 contract + 34 frontend), zero warnings</li>
      </ul>
    </div>
  );
}
