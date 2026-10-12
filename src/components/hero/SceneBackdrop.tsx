"use client";

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useReducer } from "react";
import { useMediaQuery, usePrefersReducedMotion } from "@/lib/useMediaQuery";
import { applyBackdropStyles, backdrop } from "./hangar/backdrop";

// The hangar scene is code-split and client-only so page text paints immediately.
const HangarScene = dynamic(() => import("./HangarScene"), { ssr: false, loading: () => null });

/**
 * Fixed full-screen background for the whole page (desktop, motion allowed). During the hero reveal
 * it's the live hangar scene. Once the reveal is done and content starts scrolling over it, a
 * captured still of the final frame crossfades to a pre-blurred copy under a dim, and the canvas is
 * paused, so nothing renders behind the content. Phones and reduced motion never mount it.
 */
export function SceneBackdrop() {
  const reducedMotion = usePrefersReducedMotion();
  const desktop = useMediaQuery("(min-width: 768px)", false);
  // Re-render only on rare events (a new capture), never per scroll frame.
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    backdrop.listeners.add(rerender);
    return () => {
      backdrop.listeners.delete(rerender);
    };
  }, []);

  // Newly mounted stills pick up the current crossfade immediately.
  useLayoutEffect(applyBackdropStyles);

  if (!desktop || reducedMotion) return null;

  return (
    <div aria-hidden className="fixed inset-0 z-0">
      <HangarScene />
      {/* Data-URL captures of the canvas: next/image can't optimise them, and they're decorative. */}
      {backdrop.sharp && (
        // eslint-disable-next-line @next/next/no-img-element
        <img data-backdrop-sharp src={backdrop.sharp} alt="" className="absolute inset-0 h-full w-full opacity-0" />
      )}
      {backdrop.blurred && (
        // eslint-disable-next-line @next/next/no-img-element
        <img data-backdrop-blurred src={backdrop.blurred} alt="" className="absolute inset-0 h-full w-full opacity-0" />
      )}
      <div data-backdrop-dim className="absolute inset-0 bg-bg opacity-0" />
    </div>
  );
}
