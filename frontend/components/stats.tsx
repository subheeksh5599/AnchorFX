"use client";

import { motion, useInView, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

const easeOut = [0.16, 1, 0.3, 1] as const;

const stats = [
  {
    value: 800,
    suffix: "B+",
    label: "Cross-Border Market",
  },
  {
    value: 5,
    suffix: "s",
    label: "Transaction Finality",
  },
  {
    value: 0.001,
    suffix: "",
    label: "Cost per TX (XLM)",
    decimals: 3,
  },
  {
    value: 190,
    suffix: "+",
    label: "Countries Supported",
  },
];

function AnimatedNumber({
  value,
  suffix,
  decimals = 0,
}: {
  value: number;
  suffix: string;
  decimals?: number;
}): ReactNode {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  const spring = useSpring(0, {
    stiffness: 50,
    damping: 30,
    restDelta: 0.001,
  });

  const display = useTransform(spring, (current) =>
    decimals > 0 ? current.toFixed(decimals) : Math.floor(current).toString()
  );

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, spring, value]);

  useEffect(() => {
    const unsubscribe = display.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = latest + suffix;
      }
    });
    return () => unsubscribe();
  }, [display, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

function StatCard({
  stat,
  index,
}: {
  stat: (typeof stats)[0];
  index: number;
}): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <motion.div
      ref={ref}
      className="text-center"
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        ease: easeOut,
      }}
    >
      <div className="text-foreground text-5xl font-medium tracking-tight md:text-6xl lg:text-7xl">
        <AnimatedNumber
          value={stat.value}
          suffix={stat.suffix}
          decimals={stat.decimals ?? 0}
        />
      </div>
      <p className="text-muted-foreground mt-3 text-base md:text-lg">
        {stat.label}
      </p>
    </motion.div>
  );
}

export function Stats(): ReactNode {
  const headerRef = useRef<HTMLDivElement>(null);
  const isHeaderInView = useInView(headerRef, { once: true, amount: 0.5 });

  return (
    <section className="bg-background px-6 py-16 md:py-32">
      <div className="mx-auto max-w-6xl">
        <motion.div
          ref={headerRef}
          className="mb-12 text-center md:mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={isHeaderInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: easeOut }}
        >
          <h2 className="text-3xl font-medium tracking-tight md:text-4xl lg:text-5xl">
            Trusted by Readers Worldwide
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
          {stats.map((stat, index) => (
            <StatCard key={stat.label} stat={stat} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
