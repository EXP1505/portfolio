"use client";

import { useEffect, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "lenis/react";
import { applyBackdropStyles, backdrop, backdropPaused, notifyBackdrop } from "./sky/backdrop";
import { reveal } from "./sky/reveal";

/**
 * Scroll side of the pinned hero. The section (#top) is a tall runway whose inner stage is CSS-sticky,
 * so the scene stays put while ScrollTrigger maps scroll position to reveal progress (0 → 1) for the
 * scene, and scrubs the DOM: role/pitch and the bottom links fade out early, and the big title shrinks
 * and glides onto the nav wordmark. After the runway, the scene blurs and dims into the page background
 * while the content sections rise over it. Everything is scrubbed, so scrolling back up reverses it.
 * Only loaded with the desktop scene, so phones never download GSAP.
 */
export function useHeroReveal() {
  // Keep ScrollTrigger in step with Lenis's smoothed scroll.
  const lenis = useLenis();
  useEffect(() => {
    if (!lenis) return;
    lenis.on("scroll", ScrollTrigger.update);
    return () => lenis.off("scroll", ScrollTrigger.update);
  }, [lenis]);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const section = document.getElementById("top");
    const stage = section?.querySelector<HTMLElement>("[data-hero-stage]");
    const title = section?.querySelector<HTMLElement>("[data-hero-title]");
    const sub = section?.querySelector<HTMLElement>("[data-hero-sub]");
    const links = section?.querySelector<HTMLElement>("[data-hero-links]");
    const logo = document.querySelector<HTMLElement>("[data-nav-logo]");
    if (!section || !stage || !title || !sub || !links || !logo) return;

    // Where the title must move to sit on the nav wordmark. Measured without its current transform and
    // relative to the sticky stage, so a refresh mid-scroll still gives the at-rest geometry.
    const flip = () => {
      const transform = title.style.transform;
      title.style.transform = "none";
      const from = title.getBoundingClientRect();
      title.style.transform = transform;
      const stageTop = stage.getBoundingClientRect().top;
      const to = logo.getBoundingClientRect();
      return {
        x: to.left + to.width / 2 - (from.left + from.width / 2),
        y: to.top + to.height / 2 - (from.top - stageTop + from.height / 2),
        scale: to.width / from.width,
      };
    };

    const ctx = gsap.context(() => {
      const runway = { trigger: section, start: "top top", end: "bottom bottom" };

      ScrollTrigger.create({
        ...runway,
        onUpdate: (self) => (reveal.target = self.progress),
        onRefresh: (self) => (reveal.target = self.progress),
      });

      // After the runway: the lit scene blurs and dims into the background over ~0.7 screens.
      const setBlur = (value: number) => {
        const wasPaused = backdropPaused();
        backdrop.blur = value;
        applyBackdropStyles();
        if (backdropPaused() !== wasPaused) notifyBackdrop();
      };
      ScrollTrigger.create({
        trigger: section,
        // A couple of px past the runway end, so the live scene keeps running at exactly 100%.
        start: "bottom bottom-=2",
        end: () => `bottom+=${Math.round(window.innerHeight * 0.7)} bottom`,
        onUpdate: (self) => setBlur(self.progress),
        onRefresh: (self) => setBlur(self.progress),
      });

      // Gentle parallax: each content section eases up a little as it enters (entry-only, so
      // anchors and page height are unaffected).
      gsap.utils.toArray<HTMLElement>("main > section:not(#top)").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 60 },
          { y: 0, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "top 65%", scrub: true } },
        );
      });

      // Positions on this timeline are fractions of the runway (total duration 1).
      gsap
        .timeline({ scrollTrigger: { ...runway, scrub: true, invalidateOnRefresh: true } })
        .to(links, { autoAlpha: 0, duration: 0.1, ease: "none" }, 0)
        .to(sub, { autoAlpha: 0, y: -10, duration: 0.2, ease: "none" }, 0.03)
        .to(
          title,
          { x: () => flip().x, y: () => flip().y, scale: () => flip().scale, duration: 0.45, ease: "power1.inOut" },
          0.1,
        )
        .to(title, { autoAlpha: 0, duration: 0.04, ease: "none" }, 0.53)
        .to(logo, { opacity: 1, duration: 0.04, ease: "none" }, 0.53)
        .to({}, { duration: 0.43 }, 0.57);
    });

    return () => ctx.revert();
  }, []);
}
