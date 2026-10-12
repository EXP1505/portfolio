"use client";

import { useEffect } from "react";

/**
 * Marks the nav as "at top" while the page is unscrolled, so it can sit clear over the hero there.
 * Once scrolling starts it becomes a dark translucent bar, so ceiling lights and scene detail never
 * sit behind the links. Works on every device (no GSAP).
 */
export function NavScrollState() {
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>("[data-nav]");
    if (!nav) return;
    const update = () => nav.toggleAttribute("data-top", window.scrollY <= 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return null;
}
