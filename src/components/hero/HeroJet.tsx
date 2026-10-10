"use client";

import dynamic from "next/dynamic";
import { useMediaQuery, usePrefersReducedMotion } from "@/lib/useMediaQuery";
import { JetFallback } from "./JetFallback";

// The hangar scene is code-split and client-only so hero text paints immediately.
const HangarScene = dynamic(() => import("./HangarScene"), {
  ssr: false,
  loading: () => <JetFallback />,
});

export function HeroJet() {
  const reducedMotion = usePrefersReducedMotion();
  const desktop = useMediaQuery("(min-width: 768px)", false);

  // Mobile and reduced-motion visitors get the static frame; the scene never downloads.
  return desktop && !reducedMotion ? <HangarScene /> : <JetFallback />;
}
