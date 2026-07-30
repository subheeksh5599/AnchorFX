"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

const easeOut = [0.16, 1, 0.3, 1] as const;

interface Testimonial {
  title: string;
  description: string;
  name: string;
  role: string;
}

const testimonials: Testimonial[] = [
  {
    title: "Stellar is purpose-built for cross-border",
    description:
      "With built-in DEX, path payments, and 5-second finality, Stellar is the only blockchain designed from the ground up for global payments. AnchorFX leverages every one of these primitives.",
    name: "Stellar Development Foundation",
    role: "Ecosystem",
  },
  {
    title: "Anchors are the future of on/off-ramp",
    description:
      "The SEP standard for fiat anchors on Stellar creates a composable, interoperable ramp network. AnchorFX extends this with trustless inter-anchor settlement.",
    name: "Anchor Protocol",
    role: "SEP-6, SEP-24, SEP-31",
  },
  {
    title: "Soroban makes settlement programmable",
    description:
      "Rust-based smart contracts with WASM runtime. No reentrancy, no delegatecall. Soroban escrow contracts are the settlement layer AnchorFX builds on.",
    name: "Soroban Smart Contracts",
    role: "Stellar Protocol 22+",
  },
];

export function Testimonials() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [fadeOpacity, setFadeOpacity] = useState(1);

  const updateScrollState = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const maxScroll = scrollWidth - clientWidth;
      const remainingScroll = maxScroll - scrollLeft;

      setCanScrollLeft(scrollLeft > 1);
      setCanScrollRight(scrollLeft < maxScroll - 1);

      // Fade out the gradient when approaching the end (last 150px of scroll)
      const fadeThreshold = 150;
      setFadeOpacity(Math.min(1, remainingScroll / fadeThreshold));
    }
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }
    updateScrollState();
    container.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);
    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const cardWidth = container.children[0]
        ? (container.children[0] as HTMLElement).offsetWidth
        : 400;
      const gap = 24;
      const stride = cardWidth + gap;
      const currentScroll = container.scrollLeft;
      const currentIndex = Math.round(currentScroll / stride);

      const targetIndex =
        direction === "left"
          ? Math.max(0, currentIndex - 1)
          : Math.min(testimonials.length - 1, currentIndex + 1);

      const targetScroll = targetIndex * stride;

      container.scrollTo({
        left: targetScroll,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="bg-background text-foreground overflow-hidden py-16 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          className="mb-8 flex flex-col items-start justify-between gap-4 md:mb-16 md:flex-row md:items-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: easeOut }}
        >
          <h2 className="text-foreground text-3xl font-medium tracking-tight md:text-4xl lg:text-5xl">
            What People Are Saying
          </h2>

          <div className="flex items-center gap-4">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="bg-accent hover:bg-accent/80 cursor-pointer rounded-md p-3 text-black transition-all duration-200 hover:scale-110 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
              aria-label="Scroll left"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="bg-accent hover:bg-accent/80 cursor-pointer rounded-md p-3 text-black transition-all duration-200 hover:scale-110 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
              aria-label="Scroll right"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </motion.div>

        <div className="relative -mx-6 md:mx-0">
          <div
            ref={scrollRef}
            className="scrollbar-hide flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-4 md:px-0"
            style={{ scrollPaddingInline: "1.5rem" }}
          >
            {testimonials.map((item, index) => (
              <div
                key={index}
                className="bg-muted flex h-112.5 w-[calc(100vw-3rem)] flex-none snap-start flex-col justify-between rounded-2xl p-8 md:w-100 md:p-10"
              >
                <h3 className="text-3xl leading-[1.1] font-medium tracking-tight md:text-4xl">
                  {item.title}
                </h3>
                <div>
                  <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
                    {item.description}
                  </p>
                  <div>
                    <p className="text-foreground font-medium">{item.name}</p>
                    <p className="text-muted-foreground text-sm">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div
            className="pointer-events-none absolute top-0 right-0 hidden h-full w-32 transition-opacity duration-300 md:block"
            style={{
              opacity: fadeOpacity,
              background:
                "linear-gradient(to right, transparent, var(--background))",
            }}
          />
        </div>
      </div>
    </section>
  );
}
