import { site } from "@/content/site";
import { HeroJet } from "@/components/hero/HeroJet";

// Centred "poster" opening frame: the name as a film title up top, the backlit jet below it.
export function Hero() {
  return (
    <section id="top" aria-labelledby="hero-title" className="relative h-dvh min-h-[560px] overflow-hidden bg-bg">
      <div className="absolute inset-0">
        <HeroJet />
      </div>

      <div className="hero-fade pointer-events-none absolute inset-x-0 top-[13vh] px-4 text-center sm:px-6">
        <h1
          id="hero-title"
          className="font-display text-[clamp(1.5rem,6vw,5.5rem)] leading-none font-normal tracking-[0.28em] uppercase [text-shadow:0_0_36px_rgba(232,236,241,0.32)] [padding-left:0.28em]"
        >
          {site.name}
        </h1>
        <p className="mt-5 font-mono text-[11px] tracking-[0.25em] text-muted uppercase sm:text-xs">
          {site.role} · {site.location}
        </p>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-pretty text-muted sm:text-base">{site.pitch}</p>
      </div>

      <div className="hero-fade absolute inset-x-0 bottom-[5vh] flex flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 [animation-delay:400ms]">
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
    </section>
  );
}
