"use client";

import type { ReactNode } from "react";
import { ReactLenis } from "lenis/react";
import { usePrefersReducedMotion } from "@/lib/useMediaQuery";

// Lenis is mounted as a childless root instance so toggling it (reduced motion)
// never remounts the page tree. `useLenis()` still resolves via Lenis's root store.
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <>
      {!reducedMotion && <ReactLenis root options={{ lerp: 0.1, anchors: true }} />}
      {children}
    </>
  );
}
