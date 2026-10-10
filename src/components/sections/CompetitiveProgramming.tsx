import { site } from "@/content/site";
import { Panel, Section } from "@/components/ui";

const { cp } = site;

export function CompetitiveProgramming() {
  return (
    <Section id="cp" index="06" label="Competitive programming" title={`${cp.total} problems solved.`}>
      <div className="grid gap-4 md:grid-cols-3">
        {cp.profiles.map((profile) => (
          <Panel key={profile.platform} className="flex flex-col p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-display text-lg font-medium">{profile.platform}</h3>
              {profile.title && (
                <span className="font-mono text-[11px] tracking-[0.15em] text-muted uppercase">{profile.title}</span>
              )}
            </div>

            <dl className="mt-6 grid grid-cols-3 gap-4">
              <div>
                <dt className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase">Rating</dt>
                <dd className="mt-1 font-display text-2xl font-medium text-accent-text">{profile.rating}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase">Peak</dt>
                <dd className="mt-1 font-display text-2xl font-medium text-text">{profile.peak}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase">Solved</dt>
                <dd className="mt-1 font-display text-2xl font-medium text-text">{profile.solved}</dd>
              </div>
            </dl>

            {profile.href && profile.handle && (
              <a
                href={profile.href}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-1.5 self-start border-t border-border pt-4 font-mono text-xs tracking-wider text-muted transition-colors duration-300 ease-out hover:text-text"
              >
                {profile.handle} <span aria-hidden>↗</span>
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
          </Panel>
        ))}
      </div>
    </Section>
  );
}
