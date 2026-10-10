// Static stand-in for phones and reduced motion: the cold backlight glow with a HUD reticle
// where the jet sits. Replaced by a rendered still of the lit jet in a later step.
export function JetFallback() {
  return (
    <div
      aria-hidden
      className="relative h-full w-full bg-[radial-gradient(ellipse_70%_45%_at_50%_60%,rgba(232,236,241,0.16),rgba(205,216,227,0.05)_45%,transparent_75%)]"
    >
      <svg
        viewBox="0 0 400 400"
        fill="none"
        className="absolute top-[60%] left-1/2 h-auto w-[min(60%,22rem)] -translate-x-1/2 -translate-y-1/2"
      >
        <circle cx="200" cy="200" r="150" stroke="var(--color-line)" strokeWidth="1" />
        <circle cx="200" cy="200" r="90" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="2 6" />
        <path d="M200 30v40M200 330v40M30 200h40M330 200h40" stroke="var(--color-line)" strokeWidth="1" />
        <path d="M185 200h-25M215 200h25M200 185v-10" stroke="var(--color-accent)" strokeWidth="1.5" />
        <circle cx="200" cy="200" r="2" fill="var(--color-accent)" />
      </svg>
    </div>
  );
}
