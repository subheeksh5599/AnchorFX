"use client";

import { Check, ChevronRightIcon } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";

const easeOut = [0.16, 1, 0.3, 1] as const;

interface Plan {
  name: string;
  tagline: string;
  price: string;
  period: string;
  features: string[];
  highlighted?: boolean;
}

const plans: Plan[] = [
  {
    name: "Open Source",
    tagline: "Free and open protocol",
    price: "$0",
    period: "forever",
    features: [
      "Soroban escrow contracts",
      "Stellar DEX path payments",
      "Anchor messaging protocol",
      "Testnet deployment",
    ],
  },
  {
    name: "Coming Soon",
    tagline: "Production-grade anchor settlement",
    price: "TBD",
    period: "per settlement",
    features: [
      "Regulated anchor integration",
      "SEP-31 compliance",
      "KYC/AML support",
      "Mainnet deployment",
      "Security audits",
      "Priority support",
    ],
    highlighted: true,
  },
];

function PlanCard({ plan }: { plan: Plan }): ReactNode {
  return (
    <motion.div
      className={`rounded-2xl p-6 md:p-8 ${
        plan.highlighted
          ? "border-accent bg-background border-2 transition-[border-color,box-shadow] duration-300 hover:border-accent/80 hover:shadow-lg hover:shadow-accent/10"
          : "bg-background transition-[background-color] duration-300 hover:bg-background/80"
      }`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        opacity: { duration: 0.6, ease: easeOut },
        y: { duration: 0.3, ease: easeOut },
      }}
    >
      <div className="mb-6">
        <h3 className="text-lg font-medium">{plan.name}</h3>
        <p className="text-muted-foreground text-sm">{plan.tagline}</p>
      </div>

      <div className="mb-8 flex items-baseline gap-1">
        <span className="text-4xl font-medium tracking-tight md:text-5xl">
          {plan.price}
        </span>
        <span className="text-muted-foreground text-sm">/ {plan.period}</span>
      </div>

      <ul className="space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm">
            <Check className="text-foreground mt-0.5 h-4 w-4 shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export function Pricing(): ReactNode {
  const openPlan = plans[0];
  const soonPlan = plans[1];

  if (!openPlan || !soonPlan) {
    return null;
  }

  return (
    <section className="bg-muted px-6 py-16 md:py-32">
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="mb-12 text-center md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: easeOut }}
        >
          <h2 className="mb-4 text-3xl font-medium tracking-tight md:text-4xl lg:text-5xl">
            Open Protocol
          </h2>
          <p className="text-muted-foreground text-lg">
            AnchorFX is open source. No platform fees &#8212; only Stellar
            network fees (~0.00001 XLM).
          </p>
        </motion.div>

        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-8">
          <div className="md:mt-16">
            <PlanCard plan={openPlan} />
          </div>

          <div>
            <PlanCard plan={soonPlan} />
          </div>
        </div>

        <motion.div
          className="mt-12 flex flex-col items-center gap-4 md:mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2, ease: easeOut }}
        >
          <Link
            href="/wallet"
            className="group inline-flex w-full items-center justify-center gap-3 rounded-md bg-accent py-3 pl-5 pr-3 font-medium text-black transition-all duration-500 ease-out hover:rounded-[50px] hover:shadow-lg hover:shadow-accent/20 sm:w-auto"
          >
            <span>Try the Demo</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition-all duration-300 group-hover:scale-110">
              <ChevronRightIcon className="h-4 w-4 relative left-px" />
            </span>
          </Link>
          <Link
            href="/wallet"
            className="text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            Connect Freighter Wallet
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
