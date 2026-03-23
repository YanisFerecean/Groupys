import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Groupys collects, uses, and protects your personal data.",
  alternates: { canonical: "https://groupys.app/privacy" },
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

export default function PrivacyPage() {
  return (
    <div className="bg-surface min-h-screen">
      <div className="max-w-3xl mx-auto px-8 py-24">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors mb-12"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Groupys
        </Link>

        {/* Header */}
        <div className="mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">
            Legal
          </p>
          <h1 className="text-display-lg text-on-surface mb-6">Privacy Policy</h1>
          <p className="text-on-surface-variant">
            Effective date: <strong>{EFFECTIVE_DATE}</strong>
          </p>
        </div>

        {/* Intro */}
        <p className="text-on-surface-variant leading-relaxed mb-12">
          Groupys (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is a community-based music
          platform. This policy explains what data we collect when you use Groupys, how we use it,
          and the rights you have over it. We keep this as short and plain as possible.
        </p>

        <Section title="1. Data We Collect">
          <p>
            <strong className="text-on-surface">Account information.</strong> When you sign up we
            collect your email address, username, and profile details (display name, avatar, banner)
            through our authentication provider, Clerk.
          </p>
          <p>
            <strong className="text-on-surface">Profile content.</strong> Anything you add to your
            profile — custom background, colored username, Album of the Week — is stored and
            associated with your account.
          </p>
          <p>
            <strong className="text-on-surface">Community activity.</strong> Posts, comments,
            ratings, and album reviews you submit inside communities are stored on our servers.
          </p>
          <p>
            <strong className="text-on-surface">Weekly Hot Take answers.</strong> If you choose to
            share your answers publicly, they are visible to other users and used to enrich your
            profile. Private answers are stored but never displayed to others.
          </p>
          <p>
            <strong className="text-on-surface">Match preferences.</strong> Genre preferences,
            favourite artists, and listening habits you provide are used to power the Frequency Match
            feature.
          </p>
          <p>
            <strong className="text-on-surface">Usage data.</strong> Standard server logs
            (IP address, browser type, pages visited, timestamps). We do not sell or share this
            data.
          </p>
        </Section>

        <Section title="2. How We Use Your Data">
          <p>We use the data we collect only to operate and improve Groupys:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Authenticating your account and keeping it secure.</li>
            <li>
              Powering the Frequency Match feature — comparing your taste profile against others to
              suggest connections.
            </li>
            <li>
              Displaying your public profile, posts, ratings, and Weekly Hot Take answers to other
              users where you have chosen to share them.
            </li>
            <li>Sending you the Weekly Hot Take push notification every Monday.</li>
            <li>Diagnosing errors and improving platform performance.</li>
          </ul>
          <p>We do not use your data for advertising or sell it to third parties.</p>
        </Section>

        <Section title="3. Third-Party Services">
          <p>Groupys integrates with the following external services:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <strong className="text-on-surface">Clerk</strong> — handles authentication. Your
              email and credential data is governed by{" "}
              <a
                href="https://clerk.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Clerk&apos;s Privacy Policy
              </a>
              .
            </li>
            <li>
              <strong className="text-on-surface">Last.fm</strong> — used to display global
              trending artists on the landing page. We do not share your personal data with Last.fm.
            </li>
            <li>
              <strong className="text-on-surface">Deezer</strong> — used to fetch artist images for
              the trending section. No personal data is shared.
            </li>
          </ul>
        </Section>

        <Section title="4. Data Retention">
          <p>
            We keep your account data for as long as your account is active. If you delete your
            account, we remove your personal data within 30 days, except where we are required by
            law to retain it longer.
          </p>
          <p>
            Public posts and ratings may remain visible in anonymised form after account deletion
            to preserve community history, unless you explicitly request their removal.
          </p>
        </Section>

        <Section title="5. Your Rights">
          <p>Depending on where you live, you may have the right to:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Access the personal data we hold about you.</li>
            <li>Correct inaccurate data.</li>
            <li>Request deletion of your data (&quot;right to be forgotten&quot;).</li>
            <li>Object to or restrict certain processing.</li>
            <li>Export your data in a portable format.</li>
          </ul>
          <p>
            To exercise any of these rights, email us at{" "}
            <a href="mailto:privacy@groupys.app" className="text-primary hover:underline">
              privacy@groupys.app
            </a>
            . We will respond within 30 days.
          </p>
        </Section>

        <Section title="6. Cookies">
          <p>
            We use only strictly necessary cookies — session tokens required to keep you logged in.
            We do not use tracking or advertising cookies.
          </p>
        </Section>

        <Section title="7. Children">
          <p>
            Groupys is not directed at children under 13. We do not knowingly collect data from
            children. If you believe a child has provided us with their data, contact us at{" "}
            <a href="mailto:privacy@groupys.app" className="text-primary hover:underline">
              privacy@groupys.app
            </a>{" "}
            and we will delete it promptly.
          </p>
        </Section>

        <Section title="8. Changes to This Policy">
          <p>
            We may update this policy as the platform evolves. When we make material changes we
            will notify users via email or an in-app notice at least 14 days before the change
            takes effect.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            Questions about this policy or your data? Reach us at{" "}
            <a href="mailto:privacy@groupys.app" className="text-primary hover:underline">
              privacy@groupys.app
            </a>
            .
          </p>
        </Section>

        {/* Footer note */}
        <div className="border-t border-surface-container pt-8 mt-8">
          <p className="text-xs text-on-surface-variant">
            © 2026 Groupys. All rights reserved.{" "}
            <Link href="/" className="hover:text-primary transition-colors">
              Return to homepage
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
