import { site } from "@/content/site";
import { NavScrollState } from "@/components/NavScrollState";

export function Nav() {
  return (
    <header
      data-nav
      className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-bg/75 backdrop-blur-md transition-[background-color,border-color,backdrop-filter] duration-500 ease-out"
    >
      <NavScrollState />
      <nav
        aria-label="Primary"
        className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6"
      >
        <a href="#top" aria-label={`${site.name}, back to top`} className="flex items-center">
          {/* Phones: compact monogram (the full name and five links don't fit at 390px). */}
          <span className="font-mono text-xs font-medium tracking-[0.2em] text-text uppercase md:hidden">AP</span>
          {/* Desktop: the wordmark the hero title glides into as the hangar lights up. Hidden at the
              start of the pinned reveal (the big title is on screen); the reveal fades it in. */}
          <span
            data-nav-logo
            className="hidden font-display text-sm tracking-[0.28em] text-text uppercase md:inline md:motion-safe:opacity-0"
          >
            {site.name}
          </span>
        </a>
        <ul className="flex items-center gap-4 sm:gap-7">
          {site.nav.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="py-2 font-mono text-[11px] tracking-[0.15em] text-muted uppercase transition-colors duration-300 ease-out hover:text-text sm:text-xs"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
