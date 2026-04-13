import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms and conditions for using the Groupys platform.",
  alternates: { canonical: "https://groupys.app/terms" },
  robots: { index: true, follow: false },
};

const EFFECTIVE_DATE = "20 March 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-bold text-on-surface mb-4">{title}</h2>
      <div className="space-y-4 text-on-surface-variant leading-relaxed">{children}</div>
    </section>
  );
}

export default function TermsPage() {
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
          <h1 className="text-display-lg text-on-surface mb-6">Terms of Use</h1>
          <p className="text-on-surface-variant">
            Effective date: <strong>{EFFECTIVE_DATE}</strong>
          </p>
        </div>

        <p className="text-on-surface-variant leading-relaxed mb-12">
          By accessing or using Groupys (&quot;the platform&quot;, &quot;we&quot;, &quot;us&quot;),
          you agree to be bound by these Terms of Use. If you do not agree, please do not use the
          platform.
        </p>

        <Section title="1. Eligibility">
          <p>
            You must be at least 13 years old to use Groupys. By creating an account you confirm
            that you meet this requirement. Users under 18 must have parental or guardian consent.
          </p>
        </Section>

        <Section title="2. Your Account">
          <p>
            You are responsible for keeping your login credentials secure and for all activity that
            occurs under your account. Notify us immediately at{" "}
            <a href="mailto:contact@groupys.app" className="text-primary hover:underline">
              contact@groupys.app
            </a>{" "}
            if you suspect unauthorised access.
          </p>
          <p>
            You may not create an account on behalf of someone else or use a name that is
            misleading, offensive, or infringes on another person&apos;s rights.
          </p>
        </Section>

        <Section title="3. User Content">
          <p>
            You retain ownership of the content you post on Groupys (posts, comments, profile
            information). By submitting content you grant Groupys a non-exclusive, royalty-free,
            worldwide licence to store, display, and distribute that content solely for the purpose
            of operating the platform.
          </p>
          <p>You are solely responsible for ensuring your content:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>does not infringe any third-party copyright, trademark, or other intellectual property right;</li>
            <li>is not defamatory, harassing, threatening, or hateful;</li>
            <li>does not contain spam, malware, or deceptive material;</li>
            <li>complies with all applicable laws.</li>
          </ul>
          <p>
            We reserve the right to remove content that violates these terms without prior notice.
          </p>
        </Section>

        <Section title="4. Prohibited Conduct">
          <p>When using Groupys you agree not to:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Impersonate any person or entity.</li>
            <li>Attempt to gain unauthorised access to any part of the platform or its infrastructure.</li>
            <li>Scrape, harvest, or collect data from the platform without our written consent.</li>
            <li>Use the platform to send unsolicited commercial messages.</li>
            <li>Interfere with or disrupt the integrity or performance of the platform.</li>
            <li>Engage in any activity that could harm other users or the platform itself.</li>
          </ul>
        </Section>

        <Section title="5. Community Guidelines">
          <p>
            Groupys is a music community platform. We expect all users to engage respectfully.
            Harassment, discrimination, hate speech, or targeted abuse of any kind will result in
            immediate account suspension or termination.
          </p>
        </Section>

        <Section title="6. Intellectual Property">
          <p>
            All platform code, design, logos, and branding are the property of Groupys and are
            protected by applicable intellectual property laws. You may not copy, modify, or
            distribute them without our express written permission.
          </p>
          <p>
            Music metadata, artist images, and related content displayed on the platform are sourced
            from third-party providers (Deezer, Last.fm) and are subject to their respective
            licences.
          </p>
        </Section>

        <Section title="7. Termination">
          <p>
            We may suspend or terminate your account at any time if you violate these terms or for
            any other reason at our discretion. You may delete your account at any time via your
            profile settings. Upon termination, your right to access the platform ceases immediately.
          </p>
        </Section>

        <Section title="8. Disclaimer of Warranties">
          <p>
            Groupys is provided &quot;as is&quot; and &quot;as available&quot; without warranties of
            any kind, express or implied. We do not guarantee uninterrupted, error-free, or secure
            access to the platform.
          </p>
        </Section>

        <Section title="9. Limitation of Liability">
          <p>
            To the fullest extent permitted by law, Groupys shall not be liable for any indirect,
            incidental, special, or consequential damages arising from your use of or inability to
            use the platform, even if we have been advised of the possibility of such damages.
          </p>
        </Section>

        <Section title="10. Changes to These Terms">
          <p>
            We may update these terms at any time. We will notify you of material changes via
            email or an in-app notice at least 14 days before they take effect. Continued use of
            the platform after that date constitutes acceptance of the updated terms.
          </p>
        </Section>

        <Section title="11. Governing Law">
          <p>
            These terms are governed by and construed in accordance with the laws of the European
            Union and the country in which Groupys operates, without regard to conflict-of-law
            principles.
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            Questions about these terms? Contact us at{" "}
            <a href="mailto:contact@groupys.app" className="text-primary hover:underline">
              contact@groupys.app
            </a>
            .
          </p>
        </Section>

        <div className="border-t border-surface-container pt-8 mt-8 flex flex-wrap gap-4 text-xs text-on-surface-variant">
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link href="/impressum" className="hover:text-primary transition-colors">Impressum</Link>
          <Link href="/" className="hover:text-primary transition-colors ml-auto">Return to homepage</Link>
        </div>
      </div>
    </div>
  );
}
