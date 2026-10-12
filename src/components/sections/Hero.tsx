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
          <h1
            id="hero-title"
            data-hero-title
            className="font-display text-[clamp(1.5rem,6vw,5.5rem)] leading-none font-normal tracking-[0.28em] uppercase [text-shadow:0_0_36px_rgba(232,236,241,0.28)] [padding-left:0.28em]"
          >
            {site.name}
          </h1>
          <div data-hero-sub>
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
