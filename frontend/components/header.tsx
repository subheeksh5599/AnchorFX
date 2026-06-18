"use client";

import { ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import React, { useState, useSyncExternalStore, type ReactNode } from "react";

const easeOut = [0.16, 1, 0.3, 1] as const;
const easeInOut = [0.65, 0, 0.35, 1] as const;
const spring = { type: "spring", stiffness: 100, damping: 20, mass: 1 } as const;
const DESKTOP_BREAKPOINT = 700;

const socialLinks = [
  { label: "GitHub", icon: GitHubIcon, href: "https://github.com/subheeksh5599/AnchorFX" },
];

function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    () => window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`).matches,
    () => true
  );
}

const menuCards = [
  {
    id: "products",
    title: "BUILD",
    links: [
      { label: "Demo Wallet", href: "/wallet", badge: "LIVE" },
      { label: "Smart Contract", href: "/contract", badge: "NEW" },
      { label: "Documentation", href: "#", badge: null },
    ],
  },
  {
    id: "resources",
    title: "RESOURCES",
    links: [
      { label: "Stellar Docs", href: "#", badge: null },
      { label: "Soroban SDK", href: "#", badge: null },
      { label: "GitHub", href: "https://github.com/subheeksh5599/AnchorFX", badge: null },
      { label: "Freighter Wallet", href: "https://freighter.app", badge: null },
    ],
  },
  {
    id: "contact",
    title: "CONTACT",
    links: [],
  },
];

function HamburgerIcon({ isOpen }: { isOpen: boolean }): ReactNode {
  return (
    <div className="relative flex h-2.5 w-7 cursor-pointer flex-col justify-between">
      <motion.span
        className="block h-0.5 w-full origin-center rounded-full bg-current"
        animate={isOpen ? { rotate: 45, y: 4 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.4, ease: easeOut }}
      />
      <motion.span
        className="block h-0.5 w-full origin-center rounded-full bg-current"
        animate={isOpen ? { rotate: -45, y: -4 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.4, ease: easeOut }}
      />
    </div>
  );
}

function GitHubIcon({ className }: { className?: string }): ReactNode {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function MenuCard({ card }: { card: (typeof menuCards)[number] }): ReactNode {
  return (
    <motion.div
      className="bg-menu-card min-h-50 rounded-2xl p-6 min-[1080px]:min-h-80"
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.8, ease: easeOut },
        },
      }}
    >
      <span className="text-background/50 text-xs font-medium tracking-widest uppercase">
        {card.title}
      </span>

      {card.id === "contact" && (
        <div className="mt-6 flex h-[calc(100%-2rem)] flex-col justify-between pb-4">
            <Link
              href="mailto:komasubheeksh@gmail.com"
              className="text-background hover:text-background/70 text-xl font-semibold transition-colors md:text-2xl"
            >
              komasubheeksh@gmail.com
            </Link>
          <div className="mt-auto flex items-center gap-4 pt-8">
            {socialLinks.map(({ label, icon: Icon, href }) => (
              <a
                key={label}
                href={href}
                className="bg-background/10 text-background hover:bg-background/20 flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 hover:scale-110"
                aria-label={label}
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>
      )}

      {card.links.length > 0 && (
        <ul className="mt-6">
          {card.links.map((link, index) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="group text-background hover:text-background/70 flex items-center justify-between py-4 text-xl font-semibold transition-all duration-300 md:text-2xl"
              >
                <span className="flex items-center gap-3 transition-transform duration-300 group-hover:translate-x-1">
                  {link.label}
                  {link.badge && (
                    <span className="bg-accent rounded px-2 py-0.5 text-xs font-medium text-black uppercase">
                      {link.badge}
                    </span>
                  )}
                </span>
                <ArrowUpRight className="h-5 w-5 opacity-50 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
              </Link>
              {index < card.links.length - 1 && (
                <div className="bg-background/10 h-px" />
              )}
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

export function Header(): ReactNode {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);
  const isDesktop = useIsDesktop();
  const heightDelay = isDesktop ? 0.2 : 0;
  const cardsDelay = isDesktop ? 0.7 : 0.2;

  React.useEffect(() => {
    const wrapper = document.querySelector('.h-screen.overflow-y-auto') as HTMLElement;
    if (wrapper) {
      setScrollbarWidth(wrapper.offsetWidth - wrapper.clientWidth);
    }

    const handleScroll = () => {
      const scrollY = wrapper ? wrapper.scrollTop : window.scrollY;
      setHasScrolled(scrollY > 50);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    wrapper?.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      wrapper?.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: easeOut }}
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <motion.header
        className="fixed top-0 left-0 z-50 flex w-full justify-center px-4 pt-4"
        style={{ 
          paddingRight: `calc(1rem + ${scrollbarWidth}px)`,
        }}
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          duration: 0.8,
          delay: 0.3,
          ease: easeOut,
        }}
      >
        <motion.nav
          className="bg-foreground shadow-2xl/20 border border-neutral-200/10 flex max-w-6xl flex-col overflow-hidden rounded-md"
          initial={false}
          animate={{ 
            width: isMenuOpen ? "100%" : hasScrolled ? "min(56rem, calc(100vw - 2rem))" : "min(42rem, calc(100vw - 2rem))",
          }}
          transition={{ ...spring, delay: isMenuOpen ? 0 : 0.15 }}
        >
          <div className="flex w-full items-center justify-between py-2 pr-2 pl-4">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-accent text-3xl font-extrabold -tracking-widest">
                  &#9670;
                </span>
                <span className="text-background text-2xl font-extrabold -tracking-tighter">
                  AnchorFX
                </span>
              </Link>

            <button
              className="text-background/80 hover:text-background flex h-full cursor-pointer items-center gap-2 rounded-[3.5px] px-2 transition-colors hover:bg-white/10"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <HamburgerIcon isOpen={isMenuOpen} />
              <span className="text-xl font-medium tracking-tight">Menu</span>
            </button>
          </div>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                className="overflow-hidden"
                style={{ maxHeight: "calc(100vh - 6rem)" }}
                initial={{ height: 0 }}
                animate={{
                  height: "auto",
                  transition: {
                    duration: 0.5,
                    ease: easeInOut,
                    delay: heightDelay,
                  },
                }}
                exit={{
                  height: 0,
                  transition: { duration: 0.4, ease: easeInOut },
                }}
              >
                <div
                  className="scrollbar-hide max-h-[calc(100vh-6rem)] overflow-y-auto"
                  data-lenis-prevent
                >
                  <motion.div
                    className="grid grid-cols-1 gap-6 p-6 min-[1080px]:grid-cols-3"
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={{
                      hidden: {
                        transition: {
                          staggerChildren: 0.05,
                          staggerDirection: -1,
                        },
                      },
                      visible: {
                        transition: {
                          staggerChildren: 0.1,
                          delayChildren: cardsDelay,
                        },
                      },
                    }}
                  >
                    {menuCards.map((card) => (
                      <MenuCard key={card.id} card={card} />
                    ))}
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.nav>
      </motion.header>
    </>
  );
}
