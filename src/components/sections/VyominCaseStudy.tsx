import { site } from "@/content/site";
import { FramedFigure, Section } from "@/components/ui";
import Writeup from "@/content/vyomin.mdx";

const { vyomin } = site;

function Architecture() {
  return (
    <div className="my-10">
      <FramedFigure figure={vyomin.architecture} sizes="(min-width: 768px) 720px, 100vw" />
    </div>
  );
}

export function VyominCaseStudy() {
  return (
    <Section id="vyomin" index="04" label="Case study" title="Do conflict events move markets? Testing it properly.">
      <FramedFigure figure={vyomin.eventStudy} />

      <article className="mx-auto mt-16 max-w-[44rem] md:mt-24">
        <Writeup components={{ Architecture }} />
      </article>

      <div className="mt-16 grid gap-8 md:mt-24 md:grid-cols-2">
        {vyomin.gallery.map((figure) => (
          <FramedFigure key={figure.alt} figure={figure} sizes="(min-width: 768px) 540px, 100vw" />
        ))}
      </div>
    </Section>
  );
}
