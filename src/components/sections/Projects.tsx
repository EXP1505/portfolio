import { site } from "@/content/site";
import { FramedFigure, LinkRow, Panel, Section, TagList } from "@/components/ui";

const { vyomin } = site;

export function Projects() {
  return (
    <Section id="projects" index="03" label="Projects" title="Vyomin">
      <Panel className="overflow-hidden">
        <div className="grid lg:grid-cols-[1.1fr_1fr]">
          <div className="p-5 sm:p-8 lg:p-10">
            <p className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
              Centerpiece · {vyomin.period}
            </p>
            <p className="mt-4 font-display text-xl leading-snug font-medium text-pretty md:text-2xl">
              {vyomin.tagline}
            </p>
            <p className="mt-5 leading-relaxed text-muted">{vyomin.summary}</p>
            <div className="mt-8">
              <TagList items={vyomin.stack} />
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
              <a
                href="#vyomin"
                className="py-1 font-mono text-xs tracking-wider text-text uppercase transition-colors duration-300 ease-out hover:text-accent-text"
              >
                Case study ↓
              </a>
              <LinkRow links={vyomin.links} />
            </div>
          </div>
          <div className="border-t border-border p-5 sm:p-8 lg:border-t-0 lg:border-l lg:p-10">
            <FramedFigure figure={vyomin.cover} sizes="(min-width: 1024px) 520px, 100vw" />
          </div>
        </div>

        <dl className="grid grid-cols-2 border-t border-border lg:grid-cols-4">
          {vyomin.stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`flex flex-col-reverse justify-end p-5 sm:p-8 ${i % 2 === 1 ? "border-l border-border" : ""} ${i >= 2 ? "border-t border-border lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
            >
              <dt className="mt-2 text-xs leading-relaxed text-muted md:text-sm">{stat.label}</dt>
              <dd className="font-display text-3xl font-medium text-accent-text md:text-4xl">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </Section>
  );
}
