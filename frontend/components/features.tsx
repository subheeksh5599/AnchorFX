"use client";

import { ChevronRightIcon } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

const easeOut = [0.16, 1, 0.3, 1] as const;

interface Feature {
  number: string;
  title: string;
  description: string;
  image: string;
}

const features: Feature[] = [
  {
    number: "01",
    title: "Soroban escrow contracts",
    description:
      "Funds are locked in a Rust-based Soroban smart contract with programmatic conditions — atomic settlement or timeout refund, no trusted third party.",
    image: "/img/article-summary.webp",
  },
  {
    number: "02",
    title: "Stellar DEX path payments",
    description:
      "Built-in order book at the protocol level. Forex conversion happens atomically in the same transaction — no AMM slippage, no bridge risk.",
    image: "/img/research-papers.webp",
  },
  {
    number: "03",
    title: "Anchor interoperability",
    description:
      "SEP-compatible anchor messaging for off-chain fiat settlement. Any Stellar anchor can plug into the protocol using standardized event payloads.",
    image: "/img/book-summary.webp",
  },
];

function FeatureCard({
  feature,
  index,
}: {
  feature: Feature;
  index: number;
}): ReactNode {
  return (
    <motion.div
      className="bg-muted grid grid-cols-1 gap-2 overflow-hidden rounded-2xl p-2 md:grid-cols-2 transition-colors duration-300 hover:bg-muted/80"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        ease: easeOut,
      }}
    >
      <div className="px-4 py-28">
        <span className="text-muted-foreground bg-foreground/5 mb-4 block w-fit rounded-md px-2 py-1 text-sm font-medium transition-colors duration-300 group-hover:bg-foreground/10">
          {feature.number}
        </span>
        <h3 className="mb-4 text-2xl font-medium tracking-tight md:text-3xl">
          {feature.title}
        </h3>
        <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
          {feature.description}
        </p>
      </div>

      <div className="relative aspect-4/3 w-full self-stretch overflow-hidden rounded-xl md:aspect-auto">
        <Image
          src={feature.image}
          alt={feature.title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="relative! h-full! w-full! object-cover grayscale md:absolute!"
        />
      </div>
    </motion.div>
  );
}

export function Features(): ReactNode {
  return (
    <section className="bg-background px-6 py-16 md:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">
        {/* Sticky left column */}
        <motion.div
          className="lg:sticky lg:top-60 lg:w-96 lg:shrink-0"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: easeOut }}
        >
          <h2 className="mb-4 text-2xl font-medium tracking-tight md:mb-6 md:text-3xl lg:text-4xl">
            Built on Stellar primitives
          </h2>
          <p className="text-muted-foreground mb-6 max-w-sm text-base md:mb-8 md:text-lg">
            AnchorFX combines Soroban smart contracts with Stellar&apos;s built-in
            DEX and Anchor protocol for a composable settlement layer.
          </p>
          <Link
            href="/wallet"
            className="bg-foreground group inline-flex w-full items-center justify-center gap-3 rounded-md py-3 pr-3 pl-5 font-medium text-background transition-all duration-500 ease-out hover:rounded-[50px] sm:w-auto"
          >
            <span>Launch Demo</span>
            <span className="bg-background text-foreground flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110">
              <ChevronRightIcon className="relative left-px h-4 w-4" />
            </span>
          </Link>
        </motion.div>

        {/* Scrolling right column */}
        <div className="flex min-w-0 flex-1 flex-col gap-6 md:gap-32">
          {features.map((feature, index) => (
            <FeatureCard key={feature.number} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
