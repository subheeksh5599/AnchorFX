"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";
import { CONTRACT_ID } from "@/lib/env";

interface LiveStats {
  totalEscrows: number;
  settledCount: number;
  activeCount: number;
  totalVolume: string;
  events24h: number;
}

/**
 * Live on-chain stats strip for the landing page.
 * Pulls real escrow data from the mainnet contract via /api/analytics.
 * Falls back to nothing (hidden) if the API is unreachable.
 */
export function LiveStatsStrip(): ReactNode {
  const [stats, setStats] = useState<LiveStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/analytics?contract=${CONTRACT_ID}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setStats(data);
      } catch {
        // stay hidden — stats are progressive enhancement
      }
    };
    load();
    const interval = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!stats) return null;

  const cells: Array<{ label: string; value: string }> = [
    { label: "Escrows On-Chain", value: String(stats.totalEscrows) },
    { label: "Settled", value: String(stats.settledCount) },
    { label: "Active", value: String(stats.activeCount) },
    {
      label: "Volume (units)",
      value: Number(stats.totalVolume).toLocaleString(),
    },
  ];

  return (
    <section className="bg-background border-t border-b px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-3">
          <Activity className="text-accent h-4 w-4" />
          <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
            Live Mainnet Activity
          </span>
          <span className="bg-accent ml-2 inline-flex h-1.5 w-1.5 animate-pulse rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {cells.map((cell) => (
            <div key={cell.label}>
              <div className="text-foreground text-3xl font-medium tracking-tight md:text-4xl">
                {cell.value}
              </div>
              <p className="text-muted-foreground mt-1 text-sm">{cell.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Link
            href="/explorer"
            className="text-accent hover:text-accent/80 text-xs font-medium tracking-widest uppercase"
          >
            Open Explorer →
          </Link>
        </div>
      </div>
    </section>
  );
}
