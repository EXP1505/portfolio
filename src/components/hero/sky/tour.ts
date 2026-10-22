import type { TOUR_STOPS } from "./config";

/**
 * Scroll-driven camera-tour state, shared between the scroll code and the scene without React
 * re-renders — same plain-mutable-object pattern as `reveal.ts`. `active` is written by the
 * per-section ScrollTrigger callbacks in `useHeroReveal.ts`; `settled` is written every frame by
 * `Flight()` in `SkyHero.tsx` once the damped camera seat has caught up to the active stop.
 */
export const tour = {
  active: null as keyof typeof TOUR_STOPS | null,
  settled: false,
  listeners: new Set<() => void>(),
};

export const notifyTour = () => tour.listeners.forEach((fn) => fn());
