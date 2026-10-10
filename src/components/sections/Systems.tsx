import { site } from "@/content/site";
import { Panel, Section } from "@/components/ui";

export function Systems() {
  return (
    <Section id="systems" index="02" label="Systems" title="What I build with.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {site.systems.map((system) => (
          <Panel key={system.group} className="p-5">
            <h3 className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">{system.group}</h3>
            <ul className="mt-4 space-y-2">
              {system.items.map((item) => (
                <li key={item} className="text-sm text-text">
                  {item}
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
      <p className="mt-6 font-mono text-xs leading-relaxed tracking-wider text-muted">
        <span className="uppercase">Also familiar with</span>
        <span aria-hidden className="mx-3 text-line">
          /
        </span>
        {site.alsoFamiliar.join(" · ")}
      </p>
    </Section>
  );
}
