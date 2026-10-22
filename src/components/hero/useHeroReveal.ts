"use client";

import { useEffect, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "lenis/react";
import { applyBackdropStyles, backdrop, backdropPaused, notifyBackdrop } from "./sky/backdrop";
import { reveal } from "./sky/reveal";
import { notifyTour, tour } from "./sky/tour";

// One per non-text-heavy section (see TOUR_STOPS in sky/config.ts). VyominCaseStudy is
// deliberately excluded — it stays a static background, per CLAUDE.md's "long reading section"
// spec for that one.
const TOUR_IDS = ["about", "systems", "projects", "fincraft", "cp", "contact"] as const;

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

      // Camera-tour handoff: while a tour-stop section occupies roughly the middle of the
      // viewport, the live jet wakes up and glides to that section's seat (see Flight() in
      // SkyHero.tsx). Narrower than the entry-parallax trigger above on purpose — the tour
      // shouldn't wake the instant a section's top edge appears, and should hold through most of
      // the section's reading span, not just its entry. The gap between adjacent sections'
      // windows (and the whole VyominCaseStudy span, which has no entry here at all) is a
      // deliberate dead zone where `tour.active` is null and the backdrop freezes/pauses.
      TOUR_IDS.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const setActive = (value: typeof id | null) => {
          // Don't let a stale onLeave from a stop that already lost the handoff clobber whatever
          // claimed it next.
          if (value === null && tour.active !== id) return;
          const wasPaused = backdropPaused();
          tour.active = value;
          notifyTour();
          if (backdropPaused() !== wasPaused) notifyBackdrop();
        };
        ScrollTrigger.create({
          trigger: el,
          start: "top 55%",
          end: "bottom 45%",
          onEnter: () => setActive(id),
          onEnterBack: () => setActive(id),
          onLeave: () => setActive(null),
          onLeaveBack: () => setActive(null),
        });
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
