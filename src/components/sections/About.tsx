import { site } from "@/content/site";
import { Section } from "@/components/ui";

export function About() {
  return (
    <Section id="about" index="01" label="About" title="Correct, not just running." surface>
      <div className="grid gap-12 md:grid-cols-[1fr_18rem] md:gap-20">
        <div className="max-w-2xl space-y-5 text-base leading-relaxed text-muted md:text-lg">
          {site.about.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </div>
        <dl className="space-y-6 border-t border-border pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-8">
          {site.details.map((detail) => (
            <div key={detail.label}>
              <dt className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">{detail.label}</dt>
              <dd className="mt-1.5 text-sm text-text">{detail.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}
