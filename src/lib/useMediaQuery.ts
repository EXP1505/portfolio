"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribes to a CSS media query. `serverValue` is used for SSR and the hydration pass,
 * so pick the conservative answer (e.g. assume reduced motion / no 3D until proven otherwise).
 */
export function useMediaQuery(query: string, serverValue: boolean): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)", true);
}
