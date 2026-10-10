import { site } from "@/content/site";

export function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-bg/80 backdrop-blur-md">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6"
      >
        <a href="#top" className="flex items-center gap-3 font-mono text-xs tracking-[0.2em] uppercase">
          <span className="font-medium text-text">AP</span>
          <span aria-hidden className="hidden h-3 w-px bg-line sm:block" />
          <span className="hidden text-muted sm:inline">{site.callsign}</span>
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
