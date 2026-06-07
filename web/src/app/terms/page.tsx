import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms and conditions governing your use of the Groupys platform.",
  alternates: { canonical: "https://groupys.app/terms" },
  robots: { index: true, follow: false },
};

const EFFECTIVE_DATE = "7 June 2026";
const LAST_UPDATED = "7 June 2026";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-12 scroll-mt-24">
      <h2 className="text-xl font-bold text-on-surface mb-4">{title}</h2>
      <div className="space-y-4 text-on-surface-variant leading-relaxed">{children}</div>
    </section>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-on-surface mt-2">{title}</h3>
      {children}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-surface-container my-4">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="bg-surface-container text-on-surface">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold align-top whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-on-surface-variant">
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-surface-container align-top">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Visually distinct placeholder for information the operator must confirm before publishing. */
function NeedsInput({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded bg-error/10 px-1.5 py-0.5 font-mono text-xs text-error">
      [NEEDS INPUT: {children}]
    </span>
  );
}

const mailto = (addr: string) => (
  <a href={`mailto:${addr}`} className="text-primary hover:underline">
    {addr}
  </a>
);

const ext = (href: string, label: string) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-primary hover:underline"
  >
    {label}
  </a>
);

export default function TermsPage() {
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
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">Legal</p>
          <h1 className="text-display-lg text-on-surface mb-6">Terms of Service</h1>
          <p className="text-on-surface-variant">
            Effective date: <strong>{EFFECTIVE_DATE}</strong>
            <span className="mx-2">·</span>
            Last updated: <strong>{LAST_UPDATED}</strong>
          </p>
        </div>

        {/* Intro */}
        <p className="text-on-surface-variant leading-relaxed mb-10">
          These Terms of Service (the &quot;Terms&quot;) are a legal agreement between you and Groupys.
          By accessing or using the Service, you agree to be bound by these Terms and by our{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          . If you do not agree, do not access or use the Service. We have aimed to keep the language
          clear enough for everyday readers while remaining legally precise.
        </p>

        {/* TOC */}
        <nav className="mb-16 rounded-lg border border-surface-container bg-surface-container/40 p-6">
          <p className="text-sm font-semibold text-on-surface mb-3">Contents</p>
          <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-on-surface-variant list-decimal list-inside">
            {[
              ["intro", "Introduction"],
              ["definitions", "Definitions"],
              ["eligibility", "Eligibility"],
              ["accounts", "Account Registration & Security"],
              ["description", "Description of the Service"],
              ["changes-service", "Changes to the Service"],
              ["responsibilities", "User Responsibilities"],
              ["aup", "Acceptable Use Policy"],
              ["user-content", "User Content"],
              ["ip", "Company Content & Intellectual Property"],
              ["feedback", "Feedback"],
              ["software", "Software License"],
              ["api", "API Terms"],
              ["payments", "Payments, Fees, Billing & Taxes"],
              ["subscriptions", "Subscriptions & Auto-Renewal"],
              ["refunds", "Refunds & Cancellations"],
              ["credits", "Promotions, Credits & Digital Goods"],
              ["ai", "AI & Automated Outputs"],
              ["advice", "Professional Advice Disclaimer"],
              ["third-party", "Third-Party Services & Links"],
              ["privacy", "Privacy"],
              ["security", "Security"],
              ["availability", "Availability & Service Levels"],
              ["beta", "Beta Features"],
              ["termination", "Termination & Suspension"],
              ["dmca", "IP Complaints / DMCA"],
              ["confidentiality", "Confidentiality (B2B)"],
              ["warranties", "Warranties & Disclaimers"],
              ["liability", "Limitation of Liability"],
              ["indemnification", "Indemnification"],
              ["disputes", "Dispute Resolution"],
              ["regional", "Consumer Rights & Regional Terms"],
              ["export", "Export Controls & Sanctions"],
              ["force-majeure", "Force Majeure"],
              ["assignment", "Assignment"],
              ["severability", "Severability"],
              ["waiver", "No Waiver"],
              ["entire", "Entire Agreement"],
              ["precedence", "Order of Precedence"],
              ["changes-terms", "Changes to These Terms"],
              ["contact", "Contact Information"],
              ["gap", "Compliance Gap Checklist"],
              ["review", "Legal Review Notes"],
            ].map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="hover:text-primary transition-colors">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* 1 */}
        <Section id="intro" title="1. Introduction">
          <p>
            Groupys (&quot;Groupys&quot;, the &quot;Service&quot;, &quot;we&quot;, &quot;us&quot;, or
            &quot;our&quot;) is a community-based music platform that lets people share music taste,
            post and rate albums in communities, answer the Weekly Hot Take, and discover like-minded
            listeners through the Frequency Match feature. Groupys is currently operated as a student
            project developed at a European university and is{" "}
            <strong className="text-on-surface">not yet incorporated as a registered company</strong>;
            it is operated by the Groupys development team (the &quot;Company&quot; or &quot;Service
            Provider&quot;).
          </p>
          <p>
            These Terms cover your access to and use of the Groupys website at{" "}
            {ext("https://groupys.app", "groupys.app")}, the Groupys mobile application, and all
            related features. By accessing or using the Service, you confirm that you have read,
            understood, and agree to these Terms.
          </p>
        </Section>

        {/* 2 */}
        <Section id="definitions" title="2. Definitions">
          <Table
            head={["Term", "Meaning"]}
            rows={[
              ["Service", "The Groupys website, mobile app, and related features."],
              ["User / You", "Any person who accesses or uses the Service (includes Visitors, Account Holders, and, where relevant, Consumers and Business Customers)."],
              ["Visitor", "A person who browses the Service without an account."],
              ["Account / Account Holder", "A registered profile and the person who controls it."],
              ["Content", "Any text, images, audio, data, or other material on the Service."],
              ["User Content", "Content you create, upload, post, or submit (profiles, posts, comments, ratings, reviews, Hot Take answers)."],
              ["Company Content", "The Service software, design, branding, logos, text, graphics, code, and databases owned or licensed by us."],
              ["Subscription / Fees", "Any recurring paid plan and the amounts payable for paid features, if and when offered."],
              ["Third-Party Services", "External services we integrate with or link to (e.g. Clerk, music providers, email/push providers)."],
              ["Applicable Law", "The laws and regulations that apply to you or to us."],
              ["Intellectual Property Rights", "Copyright, trademarks, database rights, design rights, patents, trade secrets, and similar rights."],
              ["Confidential Information", "Non-public information disclosed in a business context that is marked or reasonably understood to be confidential."],
            ]}
          />
        </Section>

        {/* 3 */}
        <Section id="eligibility" title="3. Eligibility">
          <p>
            You must be at least 13 years old to use the Service. By using it, you represent that you
            meet this requirement and have the legal capacity to enter into these Terms.
          </p>
          <p>
            If you are under 18 (or the age of majority where you live), you may use the Service only
            with the consent and supervision of a parent or guardian, who agrees to be bound by these
            Terms on your behalf. Where local law sets a higher minimum digital-consent age (e.g. 16 in
            parts of the EU/EEA), that age applies. If you use the Service on behalf of an organisation
            (a Business Customer), you represent that you are an Authorized User with authority to bind
            that organisation.
          </p>
        </Section>

        {/* 4 */}
        <Section id="accounts" title="4. Account Registration & Security">
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>You must provide accurate, current information and keep it up to date.</li>
            <li>You are responsible for safeguarding your credentials and for all activity under your account.</li>
            <li>You may not create an account for someone else, or use a name that is misleading, offensive, or infringes another&apos;s rights.</li>
            <li>Notify us immediately at {mailto("contact@groupys.app")} if you suspect unauthorised access.</li>
            <li>We may suspend or terminate accounts that violate these Terms or pose a security, legal, or operational risk.</li>
            <li>For Business Customers, the account holder is responsible for the acts and omissions of its Authorized Users.</li>
          </ul>
          <p>Authentication is provided through our identity provider (Clerk); see Section 20.</p>
        </Section>

        {/* 5 */}
        <Section id="description" title="5. Description of the Service">
          <p>
            Groupys lets you create a profile, join and post in music communities, rate and review
            albums, answer the Weekly Hot Take, receive opt-in push notifications, and use Frequency
            Match to discover users with similar taste. Features may vary by platform and over time. We
            do not promise that any particular feature will always be available.{" "}
            <NeedsInput>confirm the definitive feature list before publishing</NeedsInput>
          </p>
        </Section>

        {/* 6 */}
        <Section id="changes-service" title="6. Changes to the Service">
          <p>
            We may modify, update, suspend, limit, or discontinue all or part of the Service at any
            time. Where a change materially and adversely affects you, we will give reasonable notice
            where practicable and as required by law. We are not liable to you for changes,
            suspensions, or discontinuation of the Service, subject to your non-waivable rights.
          </p>
        </Section>

        {/* 7 */}
        <Section id="responsibilities" title="7. User Responsibilities">
          <p>You agree to:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Comply with these Terms and all Applicable Law.</li>
            <li>Provide accurate information and keep your account secure.</li>
            <li>Use the Service only for lawful purposes.</li>
            <li>Respect the Intellectual Property Rights and privacy of others.</li>
            <li>Not interfere with, disrupt, or overload the Service or its infrastructure.</li>
            <li>Take responsibility for your own decisions, content, and interactions.</li>
          </ul>
        </Section>

        {/* 8 */}
        <Section id="aup" title="8. Acceptable Use Policy">
          <p>You must not, and must not allow anyone else to:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Engage in illegal activity, fraud, or deception.</li>
            <li>Harass, bully, threaten, or incite violence against anyone.</li>
            <li>Post hate speech, discriminatory, or abusive content.</li>
            <li>Send spam or unsolicited commercial messages.</li>
            <li>Upload malware or other harmful code.</li>
            <li>Scrape, harvest, or collect data without our written consent.</li>
            <li>Reverse engineer, decompile, or attempt to extract source code, except where law forbids this restriction.</li>
            <li>Gain or attempt unauthorised access, or circumvent security or access controls.</li>
            <li>Upload unlawful content or content that infringes Intellectual Property Rights.</li>
            <li>Impersonate any person or entity, or misrepresent your affiliation.</li>
            <li>Exploit, endanger, or sexualise minors in any way.</li>
            <li>Violate others&apos; privacy or data-protection rights.</li>
            <li>Use bots, automation, or excessive requests to abuse the Service.</li>
            <li>Resell, sublicense, or commercially exploit the Service without our permission.</li>
            <li>Use the Service for high-risk purposes for which it is not designed.</li>
          </ul>
          <p>Violations may result in content removal, suspension, or termination, and may be reported to authorities.</p>
        </Section>

        {/* 9 */}
        <Section id="user-content" title="9. User Content">
          <p>
            <strong className="text-on-surface">Ownership.</strong> You retain ownership of your User
            Content. <strong className="text-on-surface">License to us.</strong> You grant Groupys a
            worldwide, non-exclusive, royalty-free, sublicensable licence to host, store, reproduce,
            display, adapt (e.g. resize/format), and distribute your User Content solely to operate,
            improve, and promote the Service. This licence ends when you delete your content or
            account, except for (a) copies retained in backups for a limited period and (b) content
            others have already shared or that must be retained by law.
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>You are solely responsible for the legality of your User Content and for having the rights to post it.</li>
            <li>We have no obligation to monitor User Content, but may review, moderate, or remove it at our discretion.</li>
            <li>You can report violating content to {mailto("contact@groupys.app")}.</li>
            <li>You are responsible for keeping your own backups; we are not a backup service.</li>
            <li>Content you make public may be visible to others and may be cached or copied by third parties (see Privacy Policy §19).</li>
            <li>Deletion may not be instantaneous or complete across backups and third-party caches.</li>
          </ul>
        </Section>

        {/* 10 */}
        <Section id="ip" title="10. Company Content & Intellectual Property">
          <p>
            The Service and all Company Content — software, design, branding, logos, text, graphics,
            code, and databases — are owned by or licensed to the Company and protected by Intellectual
            Property Rights. We grant you a limited, revocable, non-exclusive, non-transferable,
            non-sublicensable licence to access and use the Service for its intended purpose under these
            Terms. All rights not expressly granted are reserved.
          </p>
          <p>
            Music metadata and artist images are sourced from third-party providers (e.g. Last.fm,
            Deezer, Spotify, Apple Music) and remain subject to their respective licences and terms.
          </p>
        </Section>

        {/* 11 */}
        <Section id="feedback" title="11. Feedback">
          <p>
            If you send us feedback, suggestions, ideas, or bug reports, you grant us a perpetual,
            irrevocable, worldwide, royalty-free licence to use them for any purpose without
            restriction, compensation, or obligation to you, except where prohibited by law.
          </p>
        </Section>

        {/* 12 */}
        <Section id="software" title="12. Software License">
          <p>
            The Groupys mobile app and any downloadable components are licensed, not sold. Subject to
            these Terms, we grant you a limited, revocable, non-exclusive, non-transferable licence to
            install and use the app on devices you control for personal, non-commercial use. You may
            not copy (except as needed for normal use), modify, reverse engineer (except where law
            forbids this restriction), redistribute, or resell the software.
          </p>
          <p>
            If you obtain the app through a third-party store (e.g. Apple App Store), you must also
            comply with that store&apos;s terms, which may include additional or conflicting provisions
            that apply between you and the store.{" "}
            <NeedsInput>add Apple&apos;s required EULA/minimum-terms acknowledgements if distributing via the App Store</NeedsInput>
          </p>
        </Section>

        {/* 13 */}
        <Section id="api" title="13. API Terms">
          <p>
            We do not currently offer a public API to end users. If we make an API, SDK, or developer
            credentials available, the following apply: you must keep credentials secure; respect rate
            limits; not scrape, abuse, or overload the API; not build a competing service where
            prohibited and enforceable; and handle any data obtained in line with these Terms and the
            Privacy Policy. We may monitor usage and revoke keys at any time for abuse or risk.{" "}
            <NeedsInput>remove or expand this section depending on whether an API is offered</NeedsInput>
          </p>
        </Section>

        {/* 14 */}
        <Section id="payments" title="14. Payments, Fees, Billing & Taxes">
          <p>
            The Service is currently provided <strong className="text-on-surface">free of charge</strong>,
            and we do not process payments. If we introduce paid features in the future, the following
            principles will apply and we will publish specific terms before charging:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Prices, currency, and accepted payment methods will be shown before purchase.</li>
            <li>By purchasing, you authorise the charge and confirm your payment details are accurate.</li>
            <li>Prices may exclude taxes; you are responsible for applicable taxes unless stated otherwise.</li>
            <li>Failed, late, or reversed payments (chargebacks) may lead to suspension and recovery of amounts due.</li>
            <li>Payments would be handled by a third-party Payment Processor; we would not store full card details.</li>
            <li>We may change prices prospectively with notice as required by law.</li>
          </ul>
          <p>
            <NeedsInput>
              if/when paid: insert prices, payment methods, payment processor, tax handling, invoicing,
              and currency
            </NeedsInput>
          </p>
        </Section>

        {/* 15 */}
        <Section id="subscriptions" title="15. Subscriptions & Auto-Renewal">
          <p>
            We do not currently offer subscriptions. If subscriptions are introduced, terms will
            cover: the subscription period; clear pre-purchase disclosure of auto-renewal; how to
            cancel; renewal billing; any free trial and its conversion to a paid plan; upgrades and
            downgrades; the effect of cancellation; and refund treatment — all subject to mandatory
            consumer-law protections (including EU/UK auto-renewal and cancellation rules and, for
            U.S. users, applicable automatic-renewal laws).{" "}
            <NeedsInput>insert subscription, trial, and auto-renewal terms if/when offered</NeedsInput>
          </p>
        </Section>

        {/* 16 */}
        <Section id="refunds" title="16. Refunds & Cancellations">
          <p>
            Because the Service is currently free, no fees are charged and no refunds arise. You may
            stop using the Service or delete your account at any time. If paid features are added, the
            refund policy will:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>State refund eligibility and any digital-content limitations.</li>
            <li>Honour EU/UK consumer <strong className="text-on-surface">withdrawal rights</strong> (typically a 14-day cooling-off period), noting that this right may be lost once you start using a digital service/content with your express consent and acknowledgement.</li>
            <li>Explain how to request a refund and expected timelines.</li>
          </ul>
          <p>
            <NeedsInput>insert the definitive refund and cancellation policy before charging</NeedsInput>
          </p>
        </Section>

        {/* 17 */}
        <Section id="credits" title="17. Promotions, Credits & Digital Goods">
          <p>
            We do not currently offer credits, tokens, virtual currency, or purchasable digital goods.
            If introduced, then unless required otherwise by law: such items have no cash value, are
            non-transferable, are non-refundable, may expire where legally permitted, and may be
            modified or withdrawn. Abuse of promotions may result in forfeiture and termination.{" "}
            <NeedsInput>remove or detail if credits/tokens are introduced</NeedsInput>
          </p>
        </Section>

        {/* 18 */}
        <Section id="ai" title="18. AI & Automated Outputs">
          <p>
            Frequency Match and related features use automated processing to build a music-taste
            profile and suggest connections and content. You acknowledge that:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Automated outputs and recommendations may be inaccurate, incomplete, outdated, or unsuitable.</li>
            <li>You must use your own judgement and are responsible for how you act on outputs.</li>
            <li>Outputs are not professional advice (see Section 19).</li>
            <li>Outputs are not guaranteed to be unique; similar suggestions may be shown to different users.</li>
            <li>The feature is not designed for high-risk decisions.</li>
            <li>You retain rights in the preferences and inputs you provide; you grant us the licence in Section 9 to operate the feature.</li>
          </ul>
          <p>
            Frequency Match is opt-in; you can decline it, edit your preferences, or stop using it. See
            Privacy Policy §18 for how this profiling works and your related rights.
          </p>
        </Section>

        {/* 19 */}
        <Section id="advice" title="19. Professional Advice Disclaimer">
          <p>
            The Service is for entertainment and community purposes. It does not provide legal,
            medical, financial, tax, investment, psychological, safety, or other professional advice,
            and nothing on it should be relied on as such. Consult a qualified professional for advice
            specific to your situation.
          </p>
        </Section>

        {/* 20 */}
        <Section id="third-party" title="20. Third-Party Services & Links">
          <p>
            The Service integrates with and links to Third-Party Services, including Clerk (authentication),
            Resend (email), Google Analytics (analytics, where enabled), Expo and Apple (push
            notifications), and music providers (Last.fm, Deezer, Spotify, Apple Music). We do not
            control these services and are not responsible for their content, products, availability,
            failures, or data practices. Your use of them is governed by their own terms and privacy
            policies, and some integrations require your authorisation.
          </p>
        </Section>

        {/* 21 */}
        <Section id="privacy" title="21. Privacy">
          <p>
            We process personal data in accordance with our{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>{" "}
            and applicable data-protection law. By using the Service, you acknowledge that processing.
          </p>
        </Section>

        {/* 22 */}
        <Section id="security" title="22. Security">
          <p>
            We use reasonable technical and organisational measures to protect the Service, but no
            system is perfectly secure. You are responsible for your own account security. If you
            discover a vulnerability, report it responsibly to {mailto("contact@groupys.app")} and do
            not exploit it. You must not perform security testing, penetration testing, or scanning
            against the Service without our prior written permission.
          </p>
        </Section>

        {/* 23 */}
        <Section id="availability" title="23. Availability & Service Levels">
          <p>
            The Service is provided on an &quot;as available&quot; basis. We do not guarantee
            uninterrupted or error-free operation. Maintenance, downtime, bugs, and outages may occur,
            and we may limit or suspend the Service for security, abuse, legal, or operational reasons.
            No service-level agreement (SLA) applies unless we expressly agree one in writing.{" "}
            <NeedsInput>insert SLA terms if offering a B2B/paid tier with availability commitments</NeedsInput>
          </p>
        </Section>

        {/* 24 */}
        <Section id="beta" title="24. Beta Features">
          <p>
            We may offer experimental or &quot;beta&quot; features. These are provided as-is, may
            change or be withdrawn at any time, may contain bugs, and may not be suitable for important
            or production use. Additional terms may apply to specific beta features.
          </p>
        </Section>

        {/* 25 */}
        <Section id="termination" title="25. Termination & Suspension">
          <p>
            You may stop using the Service or delete your account at any time via your profile
            settings. We may suspend or terminate your access if you violate these Terms, fail to pay
            (for any future paid features), or where necessary for risk, legal, security, or
            operational reasons. Where appropriate and lawful, we will give notice.
          </p>
          <p>
            On termination, your right to use the Service ends. Sections that by their nature should
            survive — including Sections 9–11, 18–22, 26, 28–37, and 39 — survive termination. Account
            data is handled per the Privacy Policy (deletion within 30 days, subject to legal
            retention). Any amounts owed at termination remain due.
          </p>
        </Section>

        {/* 26 */}
        <Section id="dmca" title="26. Intellectual Property Complaints / DMCA">
          <p>
            We respect Intellectual Property Rights. If you believe content on the Service infringes
            your copyright, send a notice to {mailto("contact@groupys.app")} including: your contact
            details; identification of the work; the location (URL) of the allegedly infringing
            content; a statement of good-faith belief that the use is unauthorised; a statement that
            the information is accurate; and your physical or electronic signature.
          </p>
          <p>
            Where applicable, the affected user may submit a counter-notice. We maintain a
            repeat-infringer policy and may terminate accounts of repeat infringers.{" "}
            <NeedsInput>
              designate a copyright/DMCA agent and contact details if relying on U.S. DMCA safe harbour
            </NeedsInput>
          </p>
        </Section>

        {/* 27 */}
        <Section id="confidentiality" title="27. Confidentiality (B2B)">
          <p>
            If you use the Service as a Business Customer and we exchange Confidential Information, each
            party will: protect the other&apos;s Confidential Information with reasonable care; use it
            only for the purpose of the relationship; and not disclose it except to personnel or
            advisors bound by confidentiality. This does not cover information that is public, already
            known, independently developed, or required to be disclosed by law. On request or
            termination, Confidential Information will be returned or destroyed. These obligations
            survive termination.
          </p>
        </Section>

        {/* 28 */}
        <Section id="warranties" title="28. Warranties & Disclaimers">
          <p>
            To the fullest extent permitted by law, the Service is provided{" "}
            <strong className="text-on-surface">&quot;as is&quot;</strong> and{" "}
            <strong className="text-on-surface">&quot;as available&quot;</strong>, without warranties of
            any kind, whether express, implied, or statutory, including implied warranties of
            merchantability, fitness for a particular purpose, accuracy, reliability, non-infringement,
            and uninterrupted or error-free operation.
          </p>
          <p>
            Some jurisdictions do not allow the exclusion of certain warranties, so some of the above
            may not apply to you. Nothing in these Terms excludes or limits rights that cannot lawfully
            be excluded or limited, including mandatory consumer guarantees.
          </p>
        </Section>

        {/* 29 */}
        <Section id="liability" title="29. Limitation of Liability">
          <p>
            To the fullest extent permitted by law, the Company and its affiliates, officers,
            contractors, and licensors will not be liable for any indirect, incidental, special,
            consequential, exemplary, or punitive damages, or for lost profits, revenue, data,
            goodwill, or business interruption, arising from or related to your use of (or inability to
            use) the Service.
          </p>
          <p>
            Our total aggregate liability for all claims relating to the Service will not exceed{" "}
            <NeedsInput>
              insert cap — e.g. the greater of amounts you paid in the 12 months before the claim, or
              EUR 100 (since the Service is currently free)
            </NeedsInput>
            .
          </p>
          <p>
            These limitations do not apply to liability that cannot be excluded by law (e.g. death or
            personal injury caused by negligence, fraud, or non-waivable consumer rights). Where
            liability cannot be excluded but can be limited, it is limited to the maximum extent
            permitted.
          </p>
        </Section>

        {/* 30 */}
        <Section id="indemnification" title="30. Indemnification">
          <p>
            To the extent permitted by law, you agree to defend, indemnify, and hold harmless the
            Company and its affiliates, officers, employees, contractors, licensors, and service
            providers from and against any claims, damages, losses, liabilities, and reasonable legal
            costs arising from: your User Content; your use or misuse of the Service; your violation of
            these Terms or Applicable Law; your infringement of Intellectual Property or other rights;
            or your fraud or misrepresentation. This obligation does not apply to the extent a claim
            results from our own wrongdoing, and it is subject to applicable consumer-law limitations
            (it generally does not apply to consumers acting outside a trade or profession).
          </p>
        </Section>

        {/* 31 */}
        <Section id="disputes" title="31. Dispute Resolution">
          <p>
            <strong className="text-on-surface">Informal resolution first.</strong> Before starting any
            formal proceeding, please contact {mailto("contact@groupys.app")} so we can try to resolve
            the matter. Please allow at least 30 days.
          </p>
          <p>
            <strong className="text-on-surface">Governing law & venue.</strong> These Terms are governed
            by the laws of{" "}
            <NeedsInput>insert governing law — likely the EU member state where the Operator is based</NeedsInput>
            , without regard to conflict-of-law rules, and disputes will be subject to the courts of{" "}
            <NeedsInput>insert competent courts/venue</NeedsInput>.
          </p>
          <p>
            <strong className="text-on-surface">Arbitration / class waiver / jury waiver.</strong>{" "}
            <NeedsInput>
              decide whether to require arbitration, a class-action waiver, and a jury-trial waiver —
              these are often unenforceable against EU/UK consumers and must be drafted carefully for
              U.S. users
            </NeedsInput>
            .
          </p>
          <p>
            <strong className="text-on-surface">Exceptions.</strong> Either party may seek injunctive
            relief for Intellectual Property misuse, and you may bring qualifying claims in small-claims
            court. Nothing here removes mandatory consumer rights, including the right of EU consumers
            to bring proceedings in their country of residence and to use the EU{" "}
            {ext("https://ec.europa.eu/consumers/odr/", "Online Dispute Resolution platform")}.
          </p>
        </Section>

        {/* 32 */}
        <Section id="regional" title="32. Consumer Rights & Regional Terms">
          <p>Nothing in these Terms limits non-waivable statutory consumer rights that apply to you.</p>
          <Sub title="EU/EEA & UK consumers">
            <p>
              You benefit from mandatory consumer protections, including statutory guarantees and,
              for paid digital services/content, a right of withdrawal (typically 14 days) — which may
              be lost once performance begins with your express prior consent and acknowledgement that
              you lose the right.
            </p>
          </Sub>
          <Sub title="California & other U.S. state users">
            <p>
              You may have specific rights regarding automatic renewals, disclosures, and privacy (see
              our Privacy Policy §16). Certain warranty and liability limitations may not apply to you.
            </p>
          </Sub>
          <Sub title="Other regions (e.g. Australia, Canada)">
            <p>
              Local consumer laws may grant guarantees that cannot be excluded; these Terms do not
              limit them. <NeedsInput>confirm which regional consumer regimes apply to your user base</NeedsInput>
            </p>
          </Sub>
        </Section>

        {/* 33 */}
        <Section id="export" title="33. Export Controls & Sanctions">
          <p>
            You must not use the Service in violation of export-control or sanctions laws. You represent
            that you are not located in, or a resident of, a country or territory subject to
            comprehensive sanctions, and that you are not on any restricted-party or denied-party list.
          </p>
        </Section>

        {/* 34 */}
        <Section id="force-majeure" title="34. Force Majeure">
          <p>
            We are not liable for any delay or failure to perform caused by events beyond our
            reasonable control, including natural disasters, war, terrorism, cyberattacks, labour
            disputes, internet or hosting failures, government action, or power outages.
          </p>
        </Section>

        {/* 35 */}
        <Section id="assignment" title="35. Assignment">
          <p>
            You may not assign or transfer your rights or obligations under these Terms without our
            prior written consent. We may assign these Terms, in whole or in part, in connection with a
            merger, acquisition, restructuring, incorporation, or transfer of assets to a successor
            entity.
          </p>
        </Section>

        {/* 36 */}
        <Section id="severability" title="36. Severability">
          <p>
            If any provision of these Terms is found invalid or unenforceable, that provision will be
            limited or removed to the minimum extent necessary, and the remaining provisions will stay
            in full effect.
          </p>
        </Section>

        {/* 37 */}
        <Section id="waiver" title="37. No Waiver">
          <p>
            Our failure to enforce any right or provision is not a waiver of that right or provision.
            A waiver is effective only if made in writing.
          </p>
        </Section>

        {/* 38 */}
        <Section id="entire" title="38. Entire Agreement">
          <p>
            These Terms, together with the{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>{" "}
            and any additional terms we present for specific features, form the entire agreement
            between you and us regarding the Service and supersede prior agreements on that subject.
          </p>
        </Section>

        {/* 39 */}
        <Section id="precedence" title="39. Order of Precedence">
          <p>
            If we and a Business Customer enter into a separate signed agreement, order form, data
            processing agreement (DPA), or SLA, and it conflicts with these Terms, the documents will
            control in this order, from highest to lowest: (1) a signed agreement/order form; (2) the
            DPA; (3) the SLA; (4) feature-specific terms; (5) these Terms. Otherwise, these Terms
            control.
          </p>
        </Section>

        {/* 40 */}
        <Section id="changes-terms" title="40. Changes to These Terms">
          <p>
            We may update these Terms from time to time. The &quot;Last updated&quot; date reflects the
            latest version. For material changes, we will provide reasonable notice — typically by email
            or in-app notice at least 14 days before they take effect — and seek additional consent
            where the law requires it. Continued use after changes take effect means you accept the
            updated Terms; if you disagree, stop using the Service.
          </p>
        </Section>

        {/* 41 */}
        <Section id="contact" title="41. Contact Information">
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li><strong className="text-on-surface">Operator:</strong> Groupys (student project; not yet an incorporated company)</li>
            <li><strong className="text-on-surface">General & legal notices:</strong> {mailto("contact@groupys.app")}</li>
            <li><strong className="text-on-surface">Privacy / data requests:</strong> {mailto("privacy@groupys.app")}</li>
            <li><strong className="text-on-surface">Support:</strong> {mailto("contact@groupys.app")}</li>
            <li><strong className="text-on-surface">Postal address:</strong> <NeedsInput>add a postal address before publishing if required by your stores/jurisdiction</NeedsInput></li>
          </ul>
        </Section>

        {/* 42 */}
        <Section id="gap" title="42. Compliance Gap Checklist">
          <p>Confirm the following before publishing or relying on these Terms:</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>Legal entity name and business/postal address (once incorporated).</li>
            <li>Jurisdiction, governing law, and competent courts/venue.</li>
            <li>Arbitration, class-action waiver, and jury-trial-waiver choices (and their enforceability).</li>
            <li>Minimum age and under-16/under-18 consent handling.</li>
            <li>Payment model (currently free) and, if paid: prices, processor, taxes, invoicing.</li>
            <li>Refund and cancellation policy, including EU/UK withdrawal rights.</li>
            <li>Subscription, free-trial, and auto-renewal rules (if introduced).</li>
            <li>User-content licence scope and moderation/reporting process.</li>
            <li>AI/recommendation rules and opt-out (Frequency Match).</li>
            <li>Service availability / SLA commitments (if any).</li>
            <li>Liability cap figure.</li>
            <li>DMCA/copyright agent and contact.</li>
            <li>Data retention / account-deletion behaviour matching the Privacy Policy.</li>
            <li>Third-party service list (Clerk, Resend, Google, Expo, Apple, music APIs).</li>
            <li>App Store terms/EULA acknowledgements (if distributed via Apple).</li>
            <li>Marketplace, community-moderation, and prohibited-use rules as actually enforced.</li>
            <li>Export/sanctions relevance for your audience.</li>
            <li>B2B confidentiality and DPA/SLA/order-form conflicts (if serving businesses).</li>
          </ul>
        </Section>

        {/* 43 */}
        <Section id="review" title="43. Legal Review Notes">
          <p>
            This document is a strong, structured draft — <strong className="text-on-surface">not
            legal advice</strong>. Please note:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>A qualified lawyer should review these Terms before you rely on them.</li>
            <li>The Terms must match the actual product, business model, and technical behaviour.</li>
            <li>Consumer-protection laws may override clauses here, especially for EU/UK/Australia/Canada consumers.</li>
            <li>Arbitration clauses, class-action waivers, refund limits, liability caps, and warranty disclaimers may be unenforceable in some jurisdictions.</li>
            <li>The Privacy Policy, cookie setup, any future payment/refund/cancellation flows, and account deletion must technically match these Terms.</li>
            <li>Resolve every <NeedsInput>…</NeedsInput> marker before publishing; update entity details once Groupys is incorporated.</li>
          </ul>
        </Section>

        {/* Footer note */}
        <div className="border-t border-surface-container pt-8 mt-8 flex flex-wrap gap-4 text-xs text-on-surface-variant">
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link href="/impressum" className="hover:text-primary transition-colors">Impressum</Link>
          <Link href="/" className="hover:text-primary transition-colors ml-auto">Return to homepage</Link>
        </div>
      </div>
    </div>
  );
}
