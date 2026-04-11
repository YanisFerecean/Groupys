import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Legal Notice",
  description: "Legal information and contact details for Groupys.",
  alternates: { canonical: "https://groupys.app/impressum" },
  robots: { index: true, follow: false },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-on-surface mb-4">{title}</h2>
      <div className="space-y-3 text-on-surface-variant leading-relaxed">{children}</div>
    </section>
  );
}

export default function ImpressumPage() {
  return (
    <div className="bg-surface min-h-screen">
      <div className="max-w-3xl mx-auto px-8 py-24">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors mb-12"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Groupys
        </Link>

        <div className="mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">Legal</p>
          <h1 className="text-display-lg text-on-surface mb-6">Legal Notice</h1>
          <p className="text-on-surface-variant">
            Information in accordance with § 5 TMG (German Telemedia Act).
          </p>
        </div>

        <Section title="Service Operator">
          <p>Groupys</p>
          <p>
            A student project developed at a European university.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Email:{" "}
            <a href="mailto:contact@groupys.app" className="text-primary hover:underline">
              contact@groupys.app
            </a>
          </p>
        </Section>

        <Section title="Responsible for Content">
          <p>
            The development team behind Groupys, reachable via{" "}
            <a href="mailto:contact@groupys.app" className="text-primary hover:underline">
              contact@groupys.app
            </a>
            .
          </p>
        </Section>

        <Section title="Disclaimer">
          <p>
            <strong className="text-on-surface">Liability for content.</strong> The contents of
            this website have been created with the utmost care. However, we cannot guarantee the
            accuracy, completeness, or timeliness of the content. As a service provider we are
            responsible for our own content on these pages in accordance with general law.
          </p>
          <p>
            <strong className="text-on-surface">Liability for links.</strong> Our service may
            contain links to external third-party websites. We have no influence over the content
            of those sites and cannot accept any liability for them. The respective provider or
            operator of each linked site is always responsible for its content.
          </p>
          <p>
            <strong className="text-on-surface">Copyright.</strong> Content and works created by
            the Groupys team on this platform are subject to copyright law. Reproduction,
            processing, distribution, or any form of commercialisation of such material beyond the
            scope of copyright law requires prior written consent.
          </p>
        </Section>

        <Section title="Dispute Resolution">
          <p>
            The European Commission provides a platform for online dispute resolution (OS):{" "}
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              https://ec.europa.eu/consumers/odr/
            </a>
            . We are not willing or obliged to participate in dispute resolution proceedings before
            a consumer arbitration board.
          </p>
        </Section>

        <div className="border-t border-surface-container pt-8 mt-8 flex flex-wrap gap-4 text-xs text-on-surface-variant">
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-primary transition-colors">Terms of Use</Link>
          <Link href="/" className="hover:text-primary transition-colors ml-auto">Return to homepage</Link>
        </div>
      </div>
    </div>
  );
}
