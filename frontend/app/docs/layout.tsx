import type { Metadata } from "next";
import Link from "next/link";
import { createMetadata } from "@/lib/metadata";
import type { ReactNode } from "react";

export const metadata: Metadata = createMetadata({
  title: "Documentation",
  description:
    "AnchorFX documentation — overview, features, user guide, setup, implementation, API reference, and security.",
  path: "/docs",
});

const NAV: { group: string; items: { href: string; label: string }[] }[] = [
  {
    group: "Getting Started",
    items: [
      { href: "/docs", label: "Overview" },
      { href: "/docs/features", label: "Features" },
      { href: "/docs/usage", label: "User Guide" },
    ],
  },
  {
    group: "Developer",
    items: [
      { href: "/docs/setup", label: "Setup & Deployment" },
      { href: "/docs/implementation", label: "Implementation" },
      { href: "/docs/api", label: "API Reference" },
      { href: "/docs/security", label: "Security" },
    ],
  },
  {
    group: "Resources",
    items: [
      {
        href: "https://raw.githubusercontent.com/subheeksh5599/AnchorFX/main/README.md",
        label: "README",
      },
      { href: "/developers", label: "Live API Reference" },
      { href: "/explorer", label: "Escrow Explorer" },
      { href: "/status", label: "Network Status" },
      { href: "/rates", label: "Live FX Rates" },
    ],
  },
];

export default function DocsLayout({
  children,
}: Readonly<{ children: ReactNode }>): ReactNode {
  return (
    <main
      id="main"
      className="min-h-screen bg-black py-20 font-mono text-white"
    >
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-10 px-5 md:flex-row">
        <aside className="md:w-64 md:shrink-0">
          <Link href="/" className="mb-8 flex items-center gap-2">
            <span className="bg-accent text-2xl font-extrabold -tracking-widest text-black">
              &#9670;
            </span>
            <span className="text-xl font-extrabold -tracking-tighter">
              AnchorFX
            </span>
            <span className="ml-1 border border-neutral-700 px-1.5 py-0.5 text-[9px] tracking-[0.2em] text-neutral-400 uppercase">
              Docs
            </span>
          </Link>

          <nav className="space-y-6">
            {NAV.map((group) => (
              <div key={group.group}>
                <div className="mb-2 text-[10px] font-bold tracking-[0.25em] text-neutral-500 uppercase">
                  {group.group}
                </div>
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const isExternal = item.href.startsWith("http");
                    const children = (
                      <span className="text-[13px] text-neutral-400 transition-colors hover:text-white">
                        {item.label}
                      </span>
                    );
                    return (
                      <li key={item.label}>
                        {isExternal ? (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noreferrer"
                            className="block border-l border-neutral-800 py-1 pl-3"
                          >
                            {children}
                          </a>
                        ) : (
                          <Link
                            href={item.href}
                            className="block border-l border-neutral-800 py-1 pl-3"
                          >
                            {children}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </main>
  );
}
