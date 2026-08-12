"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Activity, Globe, ArrowUpRight } from "lucide-react";
import { ORACLE_ID, NETWORK } from "@/lib/env";

interface OracleRate {
  token: string;
  rate: number;
  updatedAt: number;
  expiresAt: number;
}

interface RouteInfo {
  from: string;
  to: string;
  rate: number;
  feePercent: number;
}

const CORRIDOR_META: Record<string, { flag: string; currency: string }> = {
  US: { flag: "🇺🇸", currency: "USD" },
  PH: { flag: "🇵🇭", currency: "PHP" },
  MX: { flag: "🇲🇽", currency: "MXN" },
  BR: { flag: "🇧🇷", currency: "BRL" },
  NG: { flag: "🇳🇬", currency: "NGN" },
  IN: { flag: "🇮🇳", currency: "INR" },
  AR: { flag: "🇦🇷", currency: "ARS" },
  GH: { flag: "🇬🇭", currency: "GHS" },
  KE: { flag: "🇰🇪", currency: "KES" },
  ID: { flag: "🇮🇩", currency: "IDR" },
  VN: { flag: "🇻🇳", currency: "VND" },
  TH: { flag: "🇹🇭", currency: "THB" },
};

const ROUTES: Record<string, RouteInfo> = {
  US_PH: { from: "US", to: "PH", rate: 56.4, feePercent: 0.15 },
  US_MX: { from: "US", to: "MX", rate: 17.2, feePercent: 0.12 },
  EUR_BR: { from: "EUR", to: "BR", rate: 5.8, feePercent: 0.18 },
  US_NG: { from: "US", to: "NG", rate: 1580, feePercent: 0.2 },
  EUR_IN: { from: "EUR", to: "IN", rate: 92.0, feePercent: 0.1 },
  US_AR: { from: "US", to: "AR", rate: 852, feePercent: 0.19 },
  US_GH: { from: "US", to: "GH", rate: 15.2, feePercent: 0.21 },
  US_KE: { from: "US", to: "KE", rate: 128.5, feePercent: 0.18 },
  US_ID: { from: "US", to: "ID", rate: 16120, feePercent: 0.16 },
  US_VN: { from: "US", to: "VN", rate: 25450, feePercent: 0.17 },
  US_TH: { from: "US", to: "TH", rate: 36.1, feePercent: 0.14 },
};

const LEGACY_CORRIDORS: Record<number, { from: string; to: string }> = {
  1: { from: "US", to: "PH" },
  2: { from: "US", to: "MX" },
  3: { from: "EUR", to: "BR" },
  4: { from: "US", to: "NG" },
  5: { from: "EUR", to: "IN" },
};

function shortToken(token: string): string {
  return token.length > 14 ? `${token.slice(0, 6)}…${token.slice(-4)}` : token;
}

export default function RatesPage(): ReactNode {
  const [oracleRates, setOracleRates] = useState<OracleRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchRates = async () => {
    try {
      const res = await fetch(`/api/rates?oracle=${ORACLE_ID}`);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      setOracleRates(data.rates ?? []);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rates");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 20000);
    return () => clearInterval(interval);
  }, []);

  const validRates = useMemo(() => {
    return oracleRates.filter((r) => r.rate > 0);
  }, [oracleRates]);

  return (
    <main id="main" className="min-h-screen bg-black font-mono text-white">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-5 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-[1fr_auto]"
        >
          <div>
            <h1 className="mb-3 text-[2.5rem] leading-[0.9] font-bold tracking-[-0.04em] uppercase">
              Live FX Rates
            </h1>
            <div className="text-xs tracking-[0.3em] text-neutral-500 uppercase">
              Oracle Contract · {NETWORK === "PUBLIC" ? "Mainnet" : "Testnet"}
            </div>
          </div>
          <div className="flex items-end gap-4">
            <Link
              href="/explorer"
              className="border-b border-neutral-800 pb-1 text-[10px] tracking-[0.2em] text-neutral-400 uppercase transition-colors hover:border-red-400 hover:text-red-400"
            >
              Explorer
            </Link>
            <Link
              href="/anchors"
              className="border-b border-neutral-800 pb-1 text-[10px] tracking-[0.2em] text-neutral-400 uppercase transition-colors hover:border-red-400 hover:text-red-400"
            >
              Settlement Desk
            </Link>
          </div>
        </motion.div>

        <hr className="mb-8 border-neutral-800" />

        {/* Oracle status */}
        <div className="mb-6 flex items-center gap-3 border border-neutral-800 p-5">
          <Activity
            className={`h-4 w-4 ${loading ? "animate-pulse text-amber-400" : validRates.length > 0 ? "text-green-400" : "text-red-400"}`}
          />
          <span className="text-[10px] tracking-[0.3em] text-neutral-400 uppercase">
            Oracle
          </span>
          <span className="font-mono text-xs text-neutral-500">
            {shortToken(ORACLE_ID)}
          </span>
          {lastUpdated && (
            <span className="ml-auto text-[10px] text-neutral-600">
              updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <a
            href={`https://stellar.expert/explorer/${NETWORK === "PUBLIC" ? "public" : "testnet"}/contract/${ORACLE_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-[10px] tracking-[0.1em] text-neutral-500 uppercase transition-colors hover:text-white"
          >
            Contract <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>

        {/* On-chain oracle rates */}
        <div className="mb-8 border border-neutral-800">
          <div className="border-b border-neutral-800 p-5">
            <h3 className="text-xs font-bold tracking-[0.3em] text-neutral-400 uppercase">
              On-Chain Oracle Rates ({oracleRates.length})
            </h3>
          </div>
          {loading && oracleRates.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-600 uppercase">
              Loading...
            </div>
          ) : error ? (
            <div className="p-12 text-center text-xs text-red-400">{error}</div>
          ) : oracleRates.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-600">
              No rates currently published on the oracle contract. Rates appear
              here as soon as the admin publishes them on-chain.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-[10px] tracking-[0.2em] text-neutral-500 uppercase">
                    <th className="p-4 text-left font-bold">Token</th>
                    <th className="p-4 text-right font-bold">Rate (scaled)</th>
                    <th className="p-4 text-right font-bold">
                      Updated (ledger)
                    </th>
                    <th className="p-4 text-right font-bold">
                      Expires (ledger)
                    </th>
                    <th className="p-4 text-center font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {oracleRates.map((r) => (
                    <tr
                      key={r.token}
                      className="border-b border-neutral-900 hover:bg-neutral-900/30"
                    >
                      <td className="p-4 font-mono text-neutral-300">
                        {shortToken(r.token)}
                      </td>
                      <td className="p-4 text-right font-bold">
                        {r.rate.toLocaleString()}
                      </td>
                      <td className="p-4 text-right text-neutral-500">
                        {r.updatedAt.toLocaleString()}
                      </td>
                      <td className="p-4 text-right text-neutral-500">
                        {r.expiresAt.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.15em] text-green-400 uppercase">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                          Live
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Corridor reference rates */}
        <div className="mb-8 border border-neutral-800">
          <div className="flex items-center gap-2 border-b border-neutral-800 p-5">
            <Globe className="h-4 w-4 text-neutral-500" />
            <h3 className="text-xs font-bold tracking-[0.3em] text-neutral-400 uppercase">
              Corridor Reference Rates
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-px bg-neutral-900 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(ROUTES).map(([key, route]) => {
              const from = CORRIDOR_META[route.from] ?? {
                flag: "🌐",
                currency: route.from,
              };
              const to = CORRIDOR_META[route.to] ?? {
                flag: "🌐",
                currency: route.to,
              };
              return (
                <div
                  key={key}
                  className="bg-black p-5 transition-colors hover:bg-neutral-900/60"
                >
                  <div className="mb-3 flex items-center justify-between text-[10px] tracking-[0.2em] text-neutral-500 uppercase">
                    <span>
                      {from.flag} {route.from} → {to.flag} {route.to}
                    </span>
                    <span>{route.feePercent}% fee</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl font-black">
                      1 {route.from === "EUR" ? "EUR" : "USD"}
                    </span>
                    <span className="text-2xl font-black text-neutral-200">
                      {route.rate.toLocaleString()}{" "}
                      <span className="text-sm text-neutral-500">
                        {to.currency}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legacy corridor mapping note */}
        <div className="mb-8 border border-neutral-800 p-5">
          <h3 className="mb-3 text-xs font-bold tracking-[0.3em] text-neutral-400 uppercase">
            Escrow Corridor Map
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(LEGACY_CORRIDORS).map(([id, c]) => (
              <span
                key={id}
                className="border border-neutral-800 px-3 py-1 text-[10px] tracking-[0.15em] text-neutral-500 uppercase"
              >
                #{id} · {c.from} → {c.to}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-20 text-center">
          <Link
            href="/"
            className="text-[10px] tracking-[0.3em] text-neutral-700 uppercase transition-colors hover:text-neutral-500"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
