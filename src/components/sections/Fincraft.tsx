import { site } from "@/content/site";
import { FramedFigure, LinkRow, Panel, Section, TagList } from "@/components/ui";

const { fincraft } = site;

export function Fincraft() {
  return (
    <Section id="fincraft" index="05" label="Also built" title={fincraft.name}>
      <Panel className="grid gap-8 p-5 sm:p-8 md:grid-cols-[1fr_1.2fr] md:gap-12 lg:p-10">
        <div>
          <p className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">{fincraft.period}</p>
          <p className="mt-4 font-display text-lg leading-snug font-medium text-pretty md:text-xl">
            {fincraft.tagline}
          </p>
          <p className="mt-5 leading-relaxed text-muted">{fincraft.summary}</p>
          <div className="mt-6">
            <TagList items={fincraft.stack} />
          </div>
          <div className="mt-6">
            <LinkRow links={fincraft.links} />
          </div>
        </div>
        <div className="space-y-6">
          <FramedFigure figure={fincraft.cover} sizes="(min-width: 768px) 560px, 100vw" />
          <div className="grid grid-cols-2 gap-4">
            {fincraft.thumbs.map((figure) => (
              <FramedFigure key={figure.alt} figure={figure} sizes="(min-width: 768px) 280px, 50vw" />
            ))}
          </div>
        </div>
      </Panel>
    </Section>
  );
}
