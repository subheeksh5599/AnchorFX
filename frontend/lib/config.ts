/**
 * AnchorFX Site Configuration
 * Atomic cross-border settlement on Stellar
 */

export const siteConfig = {
  name: "AnchorFX",
  tagline: "Atomic settlement for cross-border payments",
  description:
    "AnchorFX enables trustless, atomic FX settlement between regulated financial anchors on the Stellar network. Lock, swap, settle — in one transaction.",
  url: "https://anchorfx.dev",
  social: {
    github: "https://github.com/subheeksh5599/AnchorFX",
  },
  nav: {
    cta: {
      text: "Launch Demo",
      href: "/wallet",
    },
  },
} as const;

export const heroConfig = {
  headline: {
    prefix: "Cross-border",
    accent: "FX settlement",
    suffix: "on Stellar",
  },
  description:
    "Atomic, trustless settlement between regulated financial anchors. Lock, swap, settle — in one transaction. No intermediaries, no settlement risk.",
  cta: {
    primary: {
      text: "Try the Demo",
      href: "/wallet",
    },
    secondary: {
      text: "How It Works",
      href: "#how-it-works",
    },
  },
  carousel: [
    "USDC → PHP",
    "EURC → BRL",
    "USDC → MXN",
    "USDC → NGN",
    "EURC → INR",
    "USDC → ARS",
    "USDC → GHS",
    "USDC → KES",
    "EURC → COP",
    "USDC → IDR",
    "USDC → VND",
    "USDC → THB",
  ],
} as const;

export const howItWorksConfig = {
  title: "How AnchorFX works",
  description:
    "Three-step atomic settlement between any two Stellar anchors. Built on Soroban smart contracts.",
  cta: {
    text: "Read the Spec",
    href: "#",
  },
} as const;

export const featuresConfig = {
  title: "Built on Stellar primitives",
  description:
    "AnchorFX combines Stellar's unique protocol features into a composable settlement layer.",
} as const;

export const statsConfig = {
  title: "Why AnchorFX",
  description:
    "Cross-border payments are a $800B market. Current systems are slow, expensive, and opaque.",
} as const;

export const testimonialsConfig = {
  title: "Built for the Stellar ecosystem",
} as const;

export const pricingConfig = {
  title: "Open Protocol",
  description:
    "AnchorFX is an open-source protocol. No platform fees — only Stellar network fees (~0.00001 XLM).",
  cta: {
    primary: {
      text: "View on GitHub",
      href: "#",
    },
    secondary: {
      text: "Read the Docs",
      href: "#",
    },
  },
} as const;

export const faqConfig = {
  title: "Common Questions",
  contact: {
    text: "Building on Stellar? We'd love to hear from you.",
    cta: {
      text: "Get in Touch",
      href: "mailto:komasubheeksh@gmail.com",
    },
  },
} as const;

export const finalCtaConfig = {
  headline: "Ready to build on Stellar?",
  description:
    "AnchorFX is an open-source project for the Stellar Journey to Mastery builder program. Connect your wallet and try the demo.",
  cta: {
    text: "Launch Demo",
    href: "/wallet",
  },
} as const;

export const footerConfig = {
  description:
    "AnchorFX is an open-source protocol for atomic cross-border FX settlement on Stellar. Built with Soroban smart contracts, Stellar DEX, and the Anchor standard.",
  cta: {
    text: "Try Demo",
    href: "/wallet",
  },
  links: {
    product: [
      { label: "Demo", href: "/wallet" },
      { label: "Documentation", href: "#" },
      { label: "Smart Contracts", href: "#" },
      { label: "GitHub", href: "#" },
    ],
    company: [
      { label: "About", href: "#" },
      { label: "Stellar", href: "#" },
      { label: "Builder Program", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  contact: {
    location: "Stellar Testnet",
    address: "Stellar Journey to Mastery\nBuilder Track - Level 1",
    hours: "Open source. Build anytime.",
    email: "komasubheeksh@gmail.com",
  },
  copyright: `Built on Stellar. AnchorFX ${new Date().getFullYear()}.`,
} as const;

export const features = {
  smoothScroll: true,
  darkMode: true,
  ditherCursor: true,
  statsSection: true,
} as const;
