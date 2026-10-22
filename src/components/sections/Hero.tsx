import { site } from "@/content/site";
import { JetFallback } from "@/components/hero/JetFallback";

/**
 * Centred "poster" opening frame: the name as a film title up top, the backlit jet below it.
 * On desktop (motion allowed) the section is a tall runway and the stage inside is sticky, so the
 * hangar stays pinned while scroll drives the reveal; it releases into About only when fully lit.
 * Phones and reduced motion get a normal one-screen hero (no runway, no 3D).
 */
export function Hero() {
  return (
    <section id="top" aria-labelledby="hero-title" className="relative bg-bg md:motion-safe:h-[350vh] md:motion-safe:bg-transparent">
      <div
        data-hero-stage
        className="relative h-dvh min-h-[560px] overflow-hidden md:motion-safe:sticky md:motion-safe:top-0"
      >
        {/* Phones and reduced motion: static stand-in. Desktop: the live scene is the fixed page backdrop. */}
        <div className="absolute inset-0 md:motion-safe:hidden">
          <JetFallback />
        </div>

        <div className="hero-fade pointer-events-none absolute inset-x-0 top-[13vh] px-4 text-center sm:px-6">
          {/* A real dark backing behind the glyphs, not just a text-shadow trick — the sky can get
              genuinely bright during the reveal, and a shadow alone doesn't move the actual background
              luminance a contrast check measures. Flat fill (not a gradient — a radial falloff left the
              wide text's own edges under-covered exactly where the sun disc sits) on the title itself
              (inline-block, so it hugs the text) rather than a separate sibling, because the GSAP flip
              transforms only the title element — a sibling scrim stops tracking the moment the flip
              starts moving/shrinking it toward the nav logo. */}
          <h1
            id="hero-title"
            data-hero-title
            className="inline-block rounded-lg bg-[rgba(11,15,20,0.7)] px-6 py-5 font-display text-[clamp(1.5rem,6vw,5.5rem)] leading-none font-normal tracking-[0.28em] uppercase [text-shadow:0_2px_14px_rgba(11,15,20,0.7),0_0_36px_rgba(232,236,241,0.22)] [padding-left:0.28em]"
          >
            {site.name}
          </h1>
          {/* A dark backing shadow (not just the soft glow) keeps this legible once the sunrise
              brightens the sky behind it — the glow alone does nothing against a bright backdrop. */}
          <div data-hero-sub className="[text-shadow:0_1px_8px_rgba(11,15,20,0.75)]">
            <p className="mt-5 font-mono text-[11px] tracking-[0.25em] text-muted uppercase sm:text-xs">
              {site.role} · {site.location}
            </p>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-pretty text-muted sm:text-base">
              {site.pitch}
            </p>
          </div>
        </div>

        <div className="hero-fade absolute inset-x-0 bottom-[5vh] px-4 [animation-delay:400ms]">
          <div data-hero-links className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <a
              href="#vyomin"
              className="py-2 font-mono text-[11px] tracking-[0.2em] text-muted uppercase transition-colors duration-300 ease-out hover:text-text sm:text-xs"
            >
              Vyomin case study ↓
            </a>
            <a
              href="/resume.pdf"
              className="py-2 font-mono text-[11px] tracking-[0.2em] text-muted uppercase transition-colors duration-300 ease-out hover:text-text sm:text-xs"
            >
              Résumé ↗
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
