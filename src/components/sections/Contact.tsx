import { site } from "@/content/site";
import { LinkRow, Section } from "@/components/ui";

export function Contact() {
  return (
    <Section id="contact" index="07" label="Contact" title={site.contact.line}>
      <a
        href={`mailto:${site.email}`}
        className="inline-block font-display text-xl font-medium break-all text-text underline decoration-line underline-offset-8 transition-colors duration-300 ease-out hover:decoration-accent sm:text-2xl md:text-3xl"
      >
        {site.email}
      </a>
      <div className="mt-10">
        <LinkRow links={site.links} />
      </div>
    </Section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 font-mono text-[11px] tracking-wider text-muted sm:flex-row sm:justify-between sm:px-6">
        <p>
          © {site.footer.year} {site.name}
        </p>
        {site.footer.modelCredit && <p>{site.footer.modelCredit}</p>}
      </div>
    </footer>
  );
}
