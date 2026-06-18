"use client";

import { ReducedMotionProvider } from "@/lib/motion";
import { SmoothScroll } from "@/components/smooth-scroll";
import { WalletProvider } from "@/components/wallet-provider";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }): ReactNode {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ReducedMotionProvider>
        <WalletProvider>
          <SmoothScroll>{children}</SmoothScroll>
        </WalletProvider>
      </ReducedMotionProvider>
    </ThemeProvider>
  );
}
