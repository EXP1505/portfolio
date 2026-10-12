import type { ReactNode } from "react";
import Image from "next/image";
import type { Figure, Link } from "@/content/site";

export function Section({
  id,
  index,
  label,
  title,
  surface = false,
  children,
}: {
  id: string;
  index: string;
  label: string;
  title?: string;
  /** Sit the content on a dark, semi-transparent blurred panel (for scrolling over the scene backdrop). */
  surface?: boolean;
  children: ReactNode;
}) {
  const content = (
    <>
      <SectionHeader id={id} index={index} label={label} title={title} />
      {children}
    </>
  );
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 md:py-32">
      {surface ? (
        <div className="rounded-lg border border-border/50 bg-panel/85 p-6 backdrop-blur-md sm:p-10 md:p-14">{content}</div>
      ) : (
        content
      )}
    </section>
  );
}

function SectionHeader({ id, index, label, title }: { id: string; index: string; label: string; title?: string }) {
  return (
    <header className="mb-10 md:mb-14">
      <p className="flex items-center gap-3 font-mono text-xs tracking-[0.2em] text-muted uppercase">
        <span className="text-accent-text">{index}</span>
        <span aria-hidden className="h-px w-8 bg-line" />
        {label}
      </p>
      <h2
        id={`${id}-title`}
        className="mt-4 max-w-3xl font-display text-3xl leading-tight font-medium text-balance md:text-5xl"
      >
        {title ?? label}
      </h2>
    </header>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-sm border border-border bg-panel ${className}`}>{children}</div>;
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <li className="rounded-sm border border-border px-2 py-1 font-mono text-[11px] tracking-wide text-muted">
      {children}
    </li>
  );
}

export function TagList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Tag key={item}>{item}</Tag>
      ))}
    </ul>
  );
}

export function TextLink({ href, label }: Link) {
  const external = /^https?:\/\//.test(href);
  return (
    <a
      href={href}
      {...(external && { target: "_blank", rel: "noreferrer" })}
      className="group inline-flex items-center gap-1.5 py-1 font-mono text-xs tracking-wider text-text uppercase transition-colors duration-300 ease-out hover:text-accent-text"
    >
      {label}
      <span
        aria-hidden
        className="transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
      >
        ↗
      </span>
      {external && <span className="sr-only">(opens in a new tab)</span>}
    </a>
  );
}

export function LinkRow({ links }: { links: Link[] }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      {links.map((link) => (
        <TextLink key={link.label} {...link} />
      ))}
    </div>
  );
}

/** Image with a HUD-style frame. Renders a labelled placeholder until `src` is set. */
export function FramedFigure({ figure, sizes = "(min-width: 1152px) 1104px, 100vw" }: { figure: Figure; sizes?: string }) {
  return (
    <figure>
      <div
        className="relative overflow-hidden rounded-sm border border-border bg-panel"
        style={{ aspectRatio: `${figure.width} / ${figure.height}` }}
      >
        {figure.src ? (
          <Image src={figure.src} alt={figure.alt} fill sizes={sizes} className="object-cover" />
        ) : (
          <div
            role="img"
            aria-label={figure.alt}
            className="flex h-full items-center justify-center px-6 text-center font-mono text-[11px] tracking-[0.2em] text-muted uppercase"
          >
            Image pending
          </div>
        )}
        <Corners />
      </div>
      {figure.caption && (
        <figcaption className="mt-3 font-mono text-[11px] leading-relaxed tracking-wider text-muted uppercase">
          {figure.caption}
        </figcaption>
      )}
    </figure>
  );
}

/** Four amber HUD corner ticks. Decorative. */
export function Corners() {
  const base = "pointer-events-none absolute size-3 border-accent";
  return (
    <span aria-hidden>
      <span className={`${base} top-2 left-2 border-t border-l`} />
      <span className={`${base} top-2 right-2 border-t border-r`} />
      <span className={`${base} bottom-2 left-2 border-b border-l`} />
      <span className={`${base} right-2 bottom-2 border-r border-b`} />
    </span>
  );
}
