import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Groupys collects, uses, shares, and protects your personal data, including GDPR and CCPA/CPRA rights.",
  alternates: { canonical: "https://groupys.app/privacy" },
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
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">Legal</p>
          <h1 className="text-display-lg text-on-surface mb-6">Privacy Policy</h1>
          <p className="text-on-surface-variant">
            Effective date: <strong>{EFFECTIVE_DATE}</strong>
            <span className="mx-2">·</span>
            Last updated: <strong>{LAST_UPDATED}</strong>
          </p>
        </div>

        {/* Intro */}
        <p className="text-on-surface-variant leading-relaxed mb-10">
          This Privacy Policy explains how Groupys collects, uses, shares, and protects your personal
          data, and the rights you have over it. It is written to support compliance with the EU
          General Data Protection Regulation (&quot;GDPR&quot;), the UK GDPR and Data Protection Act
          2018 where relevant, the California Consumer Privacy Act as amended by the California Privacy
          Rights Act (&quot;CCPA/CPRA&quot;), the ePrivacy / cookie rules, and general international
          privacy best practice. We have tried to keep the legal language clear enough for everyday
          readers.
        </p>

        {/* TOC */}
        <nav className="mb-16 rounded-lg border border-surface-container bg-surface-container/40 p-6">
          <p className="text-sm font-semibold text-on-surface mb-3">Contents</p>
          <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-on-surface-variant list-decimal list-inside">
            {[
              ["intro", "Introduction"],
              ["definitions", "Definitions"],
              ["role", "Our Role"],
              ["collect", "Personal Information We Collect"],
              ["how-collect", "How We Collect Information"],
              ["why", "Why We Use Personal Information"],
              ["cookies", "Cookies & Tracking Technologies"],
              ["legal-bases", "Legal Bases Under GDPR"],
              ["share", "How We Share Personal Information"],
              ["ccpa-sale", "Sale or Sharing Under CCPA/CPRA"],
              ["sensitive", "Sensitive Personal Information"],
              ["transfers", "International Data Transfers"],
              ["retention", "Data Retention"],
              ["security", "Data Security"],
              ["gdpr-rights", "Your GDPR Rights"],
              ["ca-rights", "Your California Privacy Rights"],
              ["children", "Children's Privacy"],
              ["ai", "Automated Decision-Making, AI & Profiling"],
              ["ugc", "User Content & Public Areas"],
              ["links", "Third-Party Links & Services"],
              ["business-transfers", "Business Transfers"],
              ["changes", "Changes to This Policy"],
              ["contact", "Contact Information"],
              ["regions", "Region-Specific Notices"],
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

        {/* 1. Introduction */}
        <Section id="intro" title="1. Introduction">
          <p>
            Groupys (&quot;Groupys&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is a
            community-based music platform that lets people share music taste, post and rate albums in
            communities, answer the Weekly Hot Take, and discover like-minded listeners through the
            Frequency Match feature. Groupys is currently operated as a student project developed at a
            European university and is <strong>not yet incorporated as a registered company</strong>.
            It is operated by the Groupys development team (the &quot;Operator&quot;).
          </p>
          <p>
            This Privacy Policy applies to the Groupys website at{" "}
            {ext("https://groupys.app", "groupys.app")}, the Groupys mobile application, and all
            related features and services (together, the &quot;Service&quot;). It does not apply to
            third-party services we link to or integrate with, which have their own privacy practices
            (see Section 20).
          </p>
          <p>
            If you do not agree with this Policy, please do not use the Service. For questions or to
            exercise your rights, contact us at {mailto("privacy@groupys.app")}.
          </p>
        </Section>

        {/* 2. Definitions */}
        <Section id="definitions" title="2. Definitions">
          <p>The following terms are used throughout this Policy:</p>
          <Table
            head={["Term", "Meaning"]}
            rows={[
              ["Personal data / Personal information", "Any information relating to an identified or identifiable natural person (e.g. name, email, online identifier). Used here interchangeably across GDPR (“personal data”) and CCPA/CPRA (“personal information”)."],
              ["Processing", "Any operation performed on personal data — collection, storage, use, disclosure, deletion, etc."],
              ["Controller", "The party that determines the purposes and means of processing personal data."],
              ["Processor / Service Provider", "A party that processes personal data on behalf of, and under the instructions of, the Controller / Business."],
              ["Third Party", "A party other than the data subject, controller, or processor who may receive or process data for its own purposes."],
              ["Data Subject", "The living individual to whom personal data relates (GDPR)."],
              ["Consumer", "A California resident whose personal information is processed (CCPA/CPRA)."],
              ["Business / Contractor", "CCPA/CPRA roles: the entity determining purposes/means (Business); a party receiving PI for a business purpose under contract (Service Provider/Contractor)."],
              ["Sensitive data / Sensitive personal information", "Special-category data under GDPR (e.g. health, race, religion, biometrics) and “sensitive personal information” under CPRA (e.g. precise geolocation, account login credentials, contents of private messages)."],
              ["Sub-processor", "A processor engaged by our processor to help deliver the service."],
              ["Cookies / tracking technologies", "Small files or identifiers (cookies, pixels, SDKs, local storage) used to store or read information on your device."],
              ["Automated decision-making / Profiling", "Decisions made by automated means, and the automated evaluation of personal aspects (e.g. preferences, interests) to analyse or predict."],
              ["Authorized Agent", "A person or entity a consumer authorises to submit privacy requests on their behalf."],
              ["Supervisory Authority", "An independent public authority that monitors GDPR application (e.g. a national Data Protection Authority)."],
            ]}
          />
        </Section>

        {/* 3. Our Role */}
        <Section id="role" title="3. Our Role">
          <p>
            For most processing described in this Policy, Groupys acts as the{" "}
            <strong className="text-on-surface">Data Controller</strong> under the GDPR and as a{" "}
            <strong className="text-on-surface">Business</strong> under CCPA/CPRA, because we decide
            what data is collected and why.
          </p>
          <p>
            We engage third-party vendors that act as our{" "}
            <strong className="text-on-surface">Processors / Service Providers</strong> (e.g. our
            authentication provider and email provider) — they process data only on our documented
            instructions. The independent music providers we query (e.g. Last.fm, Deezer, Spotify,
            Apple Music) generally act as <strong className="text-on-surface">independent third
            parties / separate controllers</strong> for the data they receive under their own terms.
          </p>
          <p>
            Where you connect a third-party music account (for example, Apple Music) to power a
            feature, Groupys and that provider may each act as independent controllers for their
            respective processing. We do not currently consider ourselves a{" "}
            <strong className="text-on-surface">Joint Controller</strong> with any vendor; if that
            changes, we will update this Policy and put a joint-controller arrangement in place.
          </p>
        </Section>

        {/* 4. Personal Information We Collect */}
        <Section id="collect" title="4. Personal Information We Collect">
          <p>
            We collect only the data we need to run the Service. The table below maps each category to
            its source, purpose, GDPR legal basis, CCPA/CPRA category, retention, and whether it is
            shared with vendors. &quot;Active + 30 days&quot; means data is kept while your account is
            active and deleted within 30 days after account deletion, unless law requires longer.
          </p>
          <Table
            head={[
              "Category",
              "Examples",
              "Source",
              "Purpose",
              "GDPR legal basis",
              "CCPA/CPRA category",
              "Retention",
              "Shared with vendors?",
            ]}
            rows={[
              [
                "Account & identity data",
                "Email, username, user ID, password credentials (managed by Clerk)",
                "You / Clerk",
                "Create and secure your account, authenticate logins",
                "Contract (Art. 6(1)(b))",
                "Identifiers; account login info",
                "Active + 30 days",
                "Yes — Clerk",
              ],
              [
                "Profile content",
                "Display name, avatar, banner, custom background, coloured username, Album of the Week",
                "You",
                "Display your profile to you and others",
                "Contract; Consent for optional fields",
                "Identifiers; customer records",
                "Active + 30 days",
                "Storage (MinIO) — self-hosted",
              ],
              [
                "Community activity / user-generated content",
                "Posts, comments, ratings, album reviews",
                "You",
                "Operate communities; show your contributions",
                "Contract; Legitimate interests",
                "Internet/network activity; customer records",
                "Active; public posts may persist anonymised (see §13)",
                "Storage — self-hosted",
              ],
              [
                "Weekly Hot Take answers",
                "Your answers (public or private)",
                "You",
                "Power the Weekly Hot Take; enrich your profile if shared",
                "Consent (public sharing); Contract (private storage)",
                "Internet/network activity",
                "Active + 30 days",
                "No",
              ],
              [
                "Match / taste preferences",
                "Genre preferences, favourite artists, listening habits, taste vectors",
                "You / connected music accounts",
                "Power Frequency Match recommendations",
                "Consent",
                "Inferences; internet/network activity",
                "Active + 30 days",
                "Music APIs (for lookups)",
              ],
              [
                "Communications / support data",
                "Emails to us, support requests, in-app messages",
                "You",
                "Respond to you; deliver in-app messaging",
                "Contract; Legitimate interests",
                "Customer records; contents of communications",
                "Active + up to 24 months " ,
                "Email provider (Resend)",
              ],
              [
                "Device & notification data",
                "Expo push token, device type, OS, notification preferences",
                "Your device",
                "Deliver push notifications you opted into",
                "Consent; Contract",
                "Identifiers; internet/network activity",
                "Until token unregistered / Active + 30 days",
                "Expo, Apple (APNs)",
              ],
              [
                "Usage & log data",
                "IP address, browser/app type, pages/screens, timestamps, error logs",
                "Automatic",
                "Security, debugging, performance",
                "Legitimate interests (Art. 6(1)(f))",
                "Internet/network activity; identifiers",
                "Server logs typically up to 12 months",
                "Hosting (self-managed)",
              ],
              [
                "Analytics data",
                "Aggregated/pseudonymous usage events (if Google Analytics is enabled)",
                "Automatic (cookies/SDK)",
                "Understand and improve the Service",
                "Consent (where required)",
                "Internet/network activity",
                <span key="r">Per GA settings — <NeedsInput>confirm GA retention window</NeedsInput></span>,
                "Yes — Google",
              ],
              [
                "Cookie & tracking identifiers",
                "Session token, consent state, analytics IDs",
                "Automatic",
                "Keep you logged in; remember consent; analytics",
                "Strictly necessary (no consent); Consent (analytics)",
                "Identifiers; internet/network activity",
                "Session to 12 months (see §7)",
                "See §7 / §9",
              ],
              [
                "Music-service tokens",
                "Apple Music user token (encrypted at rest)",
                "You (when you connect an account)",
                "Fetch your music data for connected features",
                "Consent",
                "Account login info (sensitive)",
                "Until you disconnect / Active + 30 days",
                "Apple Music",
              ],
              [
                "Marketing preferences",
                "Opt-in/opt-out status for any product emails",
                "You",
                "Send only communications you allow",
                "Consent; Legitimate interests (service emails)",
                "Customer records",
                "Active + 30 days",
                "Email provider (Resend)",
              ],
            ]}
          />
          <p>
            <strong className="text-on-surface">Children&apos;s data.</strong> The Service is not
            directed to children under 13, and we do not knowingly collect their data (see Section 17).
          </p>
          <p>
            <strong className="text-on-surface">Sensitive data.</strong> We do not intentionally
            collect GDPR special-category data. Some categories above (login credentials, message
            contents, music-service tokens) are &quot;sensitive personal information&quot; under CPRA;
            see Section 11. Music taste itself is not special-category data, but content you post could
            reveal sensitive details — please do not share more than you intend.
          </p>
        </Section>

        {/* 5. How We Collect */}
        <Section id="how-collect" title="5. How We Collect Information">
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <strong className="text-on-surface">Directly from you</strong> — when you register, build
              a profile, post content, answer the Weekly Hot Take, set match preferences, or contact
              support.
            </li>
            <li>
              <strong className="text-on-surface">Automatically</strong> — through server logs, cookies,
              local storage, and mobile SDKs when you use the Service (device data, usage data,
              analytics where enabled).
            </li>
            <li>
              <strong className="text-on-surface">From our authentication provider (Clerk)</strong> —
              account and credential data is handled through Clerk during sign-up and login.
            </li>
            <li>
              <strong className="text-on-surface">From connected accounts</strong> — if you connect a
              music account (e.g. Apple Music), we receive the data needed to power that feature.
            </li>
            <li>
              <strong className="text-on-surface">From third-party APIs</strong> — we query music
              providers (Last.fm, Deezer, Spotify, Apple Music) to display artist/album data; these
              calls are generally not tied to your identity beyond what a feature requires.
            </li>
          </ul>
        </Section>

        {/* 6. Why We Use Information */}
        <Section id="why" title="6. Why We Use Personal Information">
          <Table
            head={["Purpose", "GDPR legal basis"]}
            rows={[
              ["Provide and operate the Service", "Contract (Art. 6(1)(b))"],
              ["Create and manage your account", "Contract"],
              ["Power Frequency Match and recommendations", "Consent"],
              ["Display your public profile, posts, ratings, shared Hot Takes", "Contract; Consent (for content you choose to make public)"],
              ["Deliver push notifications (e.g. the Weekly Hot Take)", "Consent; Contract"],
              ["Customer support and communications", "Contract; Legitimate interests"],
              ["Security, abuse prevention, and fraud detection", "Legitimate interests; Legal obligation"],
              ["Analytics and Service improvement", "Consent (analytics cookies); Legitimate interests (aggregate insights)"],
              ["Product/marketing emails (if any)", "Consent"],
              ["Comply with legal obligations and respond to authorities", "Legal obligation (Art. 6(1)(c))"],
              ["Establish, exercise, or defend legal claims; enforce our Terms", "Legitimate interests"],
              ["Protect the vital interests of a person in an emergency", "Vital interests (Art. 6(1)(d)) — only if truly applicable"],
            ]}
          />
          <p>
            <strong className="text-on-surface">Legitimate-interest balancing.</strong> Where we rely
            on legitimate interests, we have considered whether our interest (e.g. keeping the Service
            secure, improving it, defending claims) is overridden by your rights and freedoms, and we
            limit processing to what is necessary and proportionate. You can object at any time (see
            Section 15), and we will stop unless we have compelling legitimate grounds or need the data
            for legal claims. You can request a summary of a relevant balancing assessment by emailing{" "}
            {mailto("privacy@groupys.app")}.
          </p>
        </Section>

        {/* 7. Cookies */}
        <Section id="cookies" title="7. Cookies & Tracking Technologies">
          <p>
            We use cookies, local storage, and mobile SDKs to keep you logged in, remember your
            consent choices, and — where you allow it — measure usage. Strictly necessary cookies do
            not require consent; analytics and any non-essential cookies are set only with your consent
            where the law requires it. You can change your choices at any time via your browser/device
            settings and, where offered, our in-product cookie controls.
          </p>
          <Table
            head={["Cookie / tool", "Provider", "Purpose", "Type", "Duration", "Legal basis", "Opt-out"]}
            rows={[
              [
                "Session / auth token",
                "Clerk / Groupys",
                "Keep you signed in",
                "Strictly necessary",
                "Session",
                "Strictly necessary (no consent)",
                "Cannot be disabled without breaking login",
              ],
              [
                "Consent state",
                "Groupys",
                "Remember your cookie/consent choices",
                "Strictly necessary",
                "Up to 12 months",
                "Strictly necessary",
                "Clearing site data resets it",
              ],
              [
                "Google Analytics (_ga, _gid, etc.)",
                "Google",
                "Aggregate usage analytics (only if GA is enabled)",
                "Analytics",
                "Up to 24 months",
                "Consent",
                "Decline analytics in the consent banner; browser controls; Google opt-out add-on",
              ],
              [
                <span key="ni">Other cookies/SDKs</span>,
                <NeedsInput key="p">provider</NeedsInput>,
                <NeedsInput key="pu">purpose</NeedsInput>,
                <NeedsInput key="t">type</NeedsInput>,
                <NeedsInput key="d">duration</NeedsInput>,
                <NeedsInput key="lb">legal basis</NeedsInput>,
                <NeedsInput key="o">opt-out</NeedsInput>,
              ],
            ]}
          />
          <p>
            <NeedsInput>
              Confirm the exact cookie/SDK names actually set in production and whether a consent
              management banner is deployed. Analytics must not load before consent in the EU/UK.
            </NeedsInput>
          </p>
        </Section>

        {/* 8. Legal bases */}
        <Section id="legal-bases" title="8. Legal Bases Under GDPR">
          <p>We rely on the following legal bases, matched to specific processing:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <strong className="text-on-surface">Contract (Art. 6(1)(b))</strong> — to create your
              account, operate core features, and deliver the Service you signed up for.
            </li>
            <li>
              <strong className="text-on-surface">Consent (Art. 6(1)(a))</strong> — for Frequency Match
              taste preferences, public sharing of Hot Take answers, push notifications, analytics
              cookies, connecting music accounts, and any marketing emails. You can withdraw consent at
              any time, with no effect on processing already carried out.
            </li>
            <li>
              <strong className="text-on-surface">Legitimate interests (Art. 6(1)(f))</strong> — for
              security, abuse prevention, debugging, aggregate improvement, and defending legal claims
              (subject to the balancing test in Section 6).
            </li>
            <li>
              <strong className="text-on-surface">Legal obligation (Art. 6(1)(c))</strong> — to comply
              with applicable law and respond to lawful requests from authorities.
            </li>
            <li>
              <strong className="text-on-surface">Vital interests (Art. 6(1)(d))</strong> — only in the
              rare case it is needed to protect someone&apos;s life.
            </li>
          </ul>
          <p>
            <strong className="text-on-surface">Withdrawing consent.</strong> Disable the relevant
            feature in settings (e.g. notifications, match preferences), decline analytics in the
            consent banner, or email {mailto("privacy@groupys.app")}.
          </p>
        </Section>

        {/* 9. Sharing */}
        <Section id="share" title="9. How We Share Personal Information">
          <p>
            We do not sell your personal data. We share it only as described below. Processors /
            Service Providers act on our instructions; independent third parties act under their own
            terms.
          </p>
          <Table
            head={["Recipient", "Role", "What is shared", "Why"]}
            rows={[
              ["Clerk", "Processor / Service Provider", "Account & credential data", "Authentication and account security"],
              ["Resend", "Processor / Service Provider", "Email address, message content", "Transactional and (opt-in) product emails"],
              ["Google (Analytics)", "Processor / potentially Third Party", "Pseudonymous usage events, identifiers", "Analytics (only if enabled and consented)"],
              ["Expo + Apple (APNs)", "Processors / independent operators", "Push token, notification payload", "Deliver push notifications"],
              ["Apple Music / Last.fm / Deezer / Spotify", "Independent third parties / controllers", "Feature-specific requests; connected-account data", "Display music data; power connected features"],
              ["Hosting & storage (self-managed servers, Postgres, MinIO)", "Processor / infrastructure", "All stored data, at rest", "Run the Service"],
              ["Professional advisors", "Recipients", "As needed", "Legal, accounting, or compliance advice"],
              ["Authorities / law enforcement", "Third parties", "As legally required", "Comply with valid legal process"],
              ["Acquirer / successor", "Third party", "Relevant data", "Business transfers (see §21)"],
            ]}
          />
          <p>
            We do not currently use advertising partners or share data for cross-context behavioural
            advertising. If analytics tools are configured in a way that transmits identifiers to a
            third party for that party&apos;s own purposes, that activity is addressed in Section 10.
          </p>
        </Section>

        {/* 10. CCPA sale/share */}
        <Section id="ccpa-sale" title="10. Sale or Sharing of Personal Information (CCPA/CPRA)">
          <p>
            We do <strong className="text-on-surface">not</strong> sell your personal information for
            money. We also do not knowingly &quot;share&quot; it for cross-context behavioural
            advertising in the way CCPA/CPRA defines those terms.
          </p>
          <p>
            <strong className="text-on-surface">Analytics caveat.</strong> Under CPRA, using certain
            third-party analytics or pixels can be treated as a &quot;sale&quot; or &quot;sharing&quot;
            even without payment, because identifiers may be made available to the provider. If Google
            Analytics (or a similar tool) is enabled, we treat this conservatively and offer an opt-out.{" "}
            <NeedsInput>
              Confirm whether GA is live in production and whether its configuration constitutes a
              &quot;sale/share&quot;; if so, honour opt-out signals before loading it.
            </NeedsInput>
          </p>
          <p>If you are a California consumer, you have the right to:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <strong className="text-on-surface">Opt out of sale/sharing</strong> — email{" "}
              {mailto("privacy@groupys.app")} with &quot;Do Not Sell or Share My Personal
              Information&quot;, or decline analytics in our consent banner.
            </li>
            <li>
              <strong className="text-on-surface">Global Privacy Control (GPC)</strong> — where
              applicable, we aim to treat a recognised GPC browser signal as a valid opt-out request.{" "}
              <NeedsInput>confirm GPC detection is implemented</NeedsInput>
            </li>
            <li>
              <strong className="text-on-surface">Authorized agent</strong> — you may use an authorised
              agent (see Section 16).
            </li>
            <li>
              <strong className="text-on-surface">Non-discrimination</strong> — we will not discriminate
              against you for exercising your rights.
            </li>
          </ul>
        </Section>

        {/* 11. Sensitive PI */}
        <Section id="sensitive" title="11. Sensitive Personal Information">
          <p>
            We do not seek out GDPR special-category data. Under CPRA, the following may qualify as
            &quot;sensitive personal information&quot;:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Account login credentials (handled via Clerk).</li>
            <li>The contents of private messages or private Hot Take answers.</li>
            <li>Music-service access tokens (stored encrypted at rest).</li>
          </ul>
          <p>
            We use this information only to provide the features you requested, secure your account,
            and comply with law — <strong className="text-on-surface">not</strong> to infer
            characteristics about you and not for purposes beyond those permitted under CPRA § 7027.
            Because our use is limited to these permitted purposes, the CPRA &quot;right to limit&quot;
            generally does not change our processing; even so, you may contact{" "}
            {mailto("privacy@groupys.app")} to ask us to limit any sensitive-data use. We protect this
            data with encryption and access controls (see Section 14).
          </p>
        </Section>

        {/* 12. Transfers */}
        <Section id="transfers" title="12. International Data Transfers">
          <p>
            Groupys is operated from Europe, and our primary database and object storage are
            self-managed{" "}
            <NeedsInput>confirm server location/region and hosting provider</NeedsInput>. Some vendors
            are based outside the EU/EEA/UK (notably in the United States), so your data may be
            transferred and processed there.
          </p>
          <Table
            head={["Vendor", "Likely location", "Transfer safeguard"]}
            rows={[
              ["Clerk", "United States", "Standard Contractual Clauses / EU-US Data Privacy Framework"],
              ["Resend", "United States", "Standard Contractual Clauses"],
              ["Google (Analytics)", "United States", "SCCs / EU-US DPF"],
              ["Expo", "United States", "SCCs"],
              ["Apple (APNs / Apple Music)", "United States", "SCCs / DPF"],
              [<span key="m">Last.fm / Deezer / Spotify</span>, <NeedsInput key="l">confirm</NeedsInput>, <NeedsInput key="s">confirm safeguard</NeedsInput>],
            ]}
          />
          <p>
            Where we transfer personal data outside the EU/EEA or UK, we rely on appropriate safeguards
            — Standard Contractual Clauses (with the UK International Data Transfer Addendum for UK
            data), adequacy decisions where they exist, and vendor due diligence. We carry out a
            Transfer Impact Assessment where required.{" "}
            <NeedsInput>
              verify each vendor&apos;s current transfer mechanism and complete TIAs as needed
            </NeedsInput>
          </p>
        </Section>

        {/* 13. Retention */}
        <Section id="retention" title="13. Data Retention">
          <p>
            We keep personal data only as long as necessary for the purposes set out in this Policy,
            then delete or anonymise it.
          </p>
          <Table
            head={["Data category", "Retention", "Reason", "Deletion / anonymisation"]}
            rows={[
              ["Account, profile, preferences", "While active + 30 days after deletion", "Operate the account", "Hard-deleted from database and storage"],
              ["Public posts, ratings, reviews", "May persist in anonymised form after deletion", "Preserve community history", "De-linked from your identity unless you request full removal"],
              ["Private Hot Take answers", "Active + 30 days", "Feature delivery", "Hard-deleted"],
              ["Support / communications", <span key="r">Up to 24 months <NeedsInput>confirm</NeedsInput></span>, "Handle and audit support", "Deleted on schedule"],
              ["Push tokens", "Until unregistered / + 30 days", "Deliver notifications", "Pruned automatically when invalid"],
              ["Server / security logs", <span key="l">Up to 12 months <NeedsInput>confirm</NeedsInput></span>, "Security & debugging", "Rotated and deleted"],
              ["Analytics data", <NeedsInput key="a">confirm GA window</NeedsInput>, "Service improvement", "Expires per GA settings"],
              ["Music-service tokens", "Until disconnect / + 30 days", "Power connected features", "Deleted (and held encrypted while stored)"],
            ]}
          />
          <p>
            We may retain limited data longer where required to comply with law or to establish,
            exercise, or defend legal claims.
          </p>
        </Section>

        {/* 14. Security */}
        <Section id="security" title="14. Data Security">
          <p>
            We use technical and organisational measures appropriate to the risk, including:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Encryption in transit (HTTPS/TLS) and encryption of sensitive tokens at rest.</li>
            <li>Authentication and credential management handled by a specialist provider (Clerk).</li>
            <li>Access controls and least-privilege access to production systems.</li>
            <li>Network isolation — application services bound behind a reverse proxy.</li>
            <li>Logging and monitoring for errors and suspicious activity.</li>
            <li>Backups and a documented restore process.</li>
            <li>Dependency and vulnerability management.</li>
            <li>Confidentiality expectations for everyone with data access.</li>
          </ul>
          <p>
            No method of transmission or storage is completely secure, so we cannot guarantee absolute
            security. If a personal-data breach affects you, we will notify you and the relevant
            Supervisory Authority where required by law.
          </p>
        </Section>

        {/* 15. GDPR rights */}
        <Section id="gdpr-rights" title="15. Your GDPR Rights">
          <p>If you are in the EU/EEA or UK, you have the right to:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li><strong className="text-on-surface">Access</strong> — get a copy of your personal data.</li>
            <li><strong className="text-on-surface">Rectification</strong> — correct inaccurate data.</li>
            <li><strong className="text-on-surface">Erasure</strong> — delete your data (&quot;right to be forgotten&quot;).</li>
            <li><strong className="text-on-surface">Restriction</strong> — limit how we process your data.</li>
            <li><strong className="text-on-surface">Portability</strong> — receive your data in a structured, machine-readable format.</li>
            <li><strong className="text-on-surface">Object</strong> — object to processing based on legitimate interests or to direct marketing.</li>
            <li><strong className="text-on-surface">Withdraw consent</strong> — at any time, without affecting prior processing.</li>
            <li><strong className="text-on-surface">Automated decisions</strong> — rights relating to automated decision-making and profiling (see Section 18).</li>
            <li>
              <strong className="text-on-surface">Lodge a complaint</strong> — with your local
              Supervisory Authority. We&apos;d appreciate the chance to resolve concerns first.
            </li>
          </ul>
          <p>
            To exercise any right, email {mailto("privacy@groupys.app")}. We may need to verify your
            identity (typically by confirming control of your account email) before acting, to protect
            your data. We aim to respond within one month, extendable by two further months for complex
            requests, as the GDPR allows.
          </p>
        </Section>

        {/* 16. California rights */}
        <Section id="ca-rights" title="16. Your California Privacy Rights">
          <p>If you are a California resident, you have the right to:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li><strong className="text-on-surface">Know / access</strong> the categories and specific pieces of PI we collect, use, and disclose.</li>
            <li><strong className="text-on-surface">Delete</strong> PI we hold about you, subject to legal exceptions.</li>
            <li><strong className="text-on-surface">Correct</strong> inaccurate PI.</li>
            <li><strong className="text-on-surface">Opt out</strong> of any sale or sharing of PI (see Section 10).</li>
            <li><strong className="text-on-surface">Limit</strong> the use of sensitive PI to permitted purposes (see Section 11).</li>
            <li><strong className="text-on-surface">Data portability</strong> — receive PI in a portable format where applicable.</li>
            <li><strong className="text-on-surface">Non-discrimination</strong> for exercising your rights.</li>
          </ul>
          <p>
            <strong className="text-on-surface">How to submit.</strong> Email{" "}
            {mailto("privacy@groupys.app")}. <strong className="text-on-surface">Authorized
            agents</strong> may submit requests with proof of authorisation; we may still ask you to
            verify your identity directly. We verify requests by confirming control of your account
            email and, for sensitive requests, additional account details. We respond to verifiable
            requests within 45 days, extendable by another 45 days with notice. If we decline a
            request, you may ask us to reconsider by replying to our response.
          </p>
        </Section>

        {/* 17. Children */}
        <Section id="children" title="17. Children's Privacy">
          <p>
            The Service is intended for users aged 13 and over and is not directed to children under
            13. We do not knowingly collect personal data from children under 13.
          </p>
          <p>
            In parts of the EU/EEA, the minimum age to consent to information-society services without
            parental authorisation is 16 (or a lower age, down to 13, set by national law). Where that
            applies and you are below the local digital-consent age, you should use the Service only
            with verifiable parental/guardian consent.
          </p>
          <p>
            If you believe a child has provided us personal data without appropriate consent, contact{" "}
            {mailto("privacy@groupys.app")} and we will delete it promptly.{" "}
            <NeedsInput>
              confirm the App Store age rating and whether any users are under 16/18 in practice
            </NeedsInput>
          </p>
        </Section>

        {/* 18. AI */}
        <Section id="ai" title="18. Automated Decision-Making, AI & Profiling">
          <p>
            <strong className="text-on-surface">Frequency Match</strong> uses your music-taste data —
            genres, favourite artists, listening habits — to build a taste profile (a numeric
            &quot;vector&quot;) and compare it with other users to suggest people you might connect
            with. This is a form of profiling.
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li><strong className="text-on-surface">Data used:</strong> your stated preferences and taste signals you provide or connect.</li>
            <li><strong className="text-on-surface">Purpose:</strong> recommend potential connections and relevant content.</li>
            <li><strong className="text-on-surface">Impact:</strong> it affects suggestions only — it does not produce legal or similarly significant effects, set prices, or restrict access.</li>
            <li><strong className="text-on-surface">Control:</strong> Frequency Match runs on consent. You can decline it, edit or remove your preferences, or stop using the feature at any time.</li>
            <li><strong className="text-on-surface">Human review / objection:</strong> contact {mailto("privacy@groupys.app")} to object to profiling or request human review.</li>
          </ul>
          <p>
            We do not use automated decision-making that produces legal or similarly significant
            effects within the meaning of GDPR Article 22.
          </p>
        </Section>

        {/* 19. UGC */}
        <Section id="ugc" title="19. User Content & Public Areas">
          <p>
            Content you choose to make public — profile details, posts, ratings, reviews, and shared
            Hot Take answers — is visible to other users and, potentially, to the wider internet. Once
            public, it may be copied, cached, or archived by others and by search engines, and we
            cannot guarantee complete removal from such third-party systems. Please think before you
            post, and avoid sharing sensitive information you do not want public.
          </p>
        </Section>

        {/* 20. Links */}
        <Section id="links" title="20. Third-Party Links & Services">
          <p>
            The Service links to and integrates with third-party services (e.g. Clerk, Last.fm,
            Deezer, Spotify, Apple Music). Their privacy practices are governed by their own policies,
            not this one. We encourage you to review them — for example,{" "}
            {ext("https://clerk.com/privacy", "Clerk's Privacy Policy")}. We are not responsible for
            third-party content or data practices.
          </p>
        </Section>

        {/* 21. Business transfers */}
        <Section id="business-transfers" title="21. Business Transfers">
          <p>
            If Groupys is incorporated, restructured, merged, acquired, or its assets are sold (or in
            the event of insolvency), personal data may be transferred to a successor or acquirer as
            part of that transaction. We will require the recipient to honour this Policy or give you
            notice and choices as required by law.
          </p>
        </Section>

        {/* 22. Changes */}
        <Section id="changes" title="22. Changes to This Privacy Policy">
          <p>
            We may update this Policy as the Service evolves. The &quot;Last updated&quot; date at the
            top reflects the latest version. For material changes, we will provide reasonable advance
            notice — typically by email or an in-app notice at least 14 days before the change takes
            effect — and, where required, seek your consent.
          </p>
        </Section>

        {/* 23. Contact */}
        <Section id="contact" title="23. Contact Information">
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li><strong className="text-on-surface">Operator:</strong> Groupys (student project; not yet an incorporated company)</li>
            <li><strong className="text-on-surface">Privacy / data requests:</strong> {mailto("privacy@groupys.app")}</li>
            <li><strong className="text-on-surface">General contact:</strong> {mailto("contact@groupys.app")}</li>
            <li><strong className="text-on-surface">Mailing address:</strong> <NeedsInput>add a postal address before publishing if required by your stores/jurisdiction</NeedsInput></li>
            <li><strong className="text-on-surface">Data Protection Officer:</strong> not appointed — <NeedsInput>confirm a DPO is not legally required for your processing</NeedsInput></li>
            <li><strong className="text-on-surface">EU/UK Representative:</strong> not appointed — <NeedsInput>confirm whether an Art. 27 representative is required</NeedsInput></li>
          </ul>
        </Section>

        {/* 24. Region-specific */}
        <Section id="regions" title="24. Region-Specific Notices">
          <Sub title="EU/EEA & UK users">
            <p>
              Groupys acts as Controller. The legal bases, rights, transfer safeguards, and complaint
              rights described in Sections 6, 8, 12, and 15 apply to you. You may complain to your
              local Supervisory Authority.
            </p>
          </Sub>
          <Sub title="California users">
            <p>
              Sections 10, 11, and 16 set out your CCPA/CPRA rights, our position on sale/sharing, our
              treatment of sensitive PI, and how to submit requests (including via an authorised agent).
            </p>
          </Sub>
          <Sub title="Other US state privacy laws">
            <p>
              Residents of states with comprehensive privacy laws (e.g. Virginia, Colorado, Connecticut,
              Utah, and others) may have similar rights to access, correct, delete, and opt out of
              targeted advertising or profiling. Contact {mailto("privacy@groupys.app")} to exercise
              them. <NeedsInput>confirm which state laws apply based on your user base</NeedsInput>
            </p>
          </Sub>
          <Sub title="Other jurisdictions">
            <p>
              If you are elsewhere, your local law may grant additional rights; we will honour valid
              requests to the extent the law requires.
            </p>
          </Sub>
        </Section>

        {/* 25. Gap checklist */}
        <Section id="gap" title="25. Compliance Gap Checklist">
          <p>Confirm the following before publishing or relying on this Policy:</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>Exact data categories actually collected match Section 4.</li>
            <li>Final vendor / sub-processor list (Clerk, Resend, Google, Expo, Apple, music APIs, hosting).</li>
            <li>Real cookie/SDK list and a deployed consent banner (analytics gated until consent in EU/UK).</li>
            <li>Confirmed retention periods (support, logs, analytics).</li>
            <li>International-transfer countries and per-vendor safeguards (SCCs/DPF/UK IDTA) + TIAs.</li>
            <li>Whether analytics/pixels count as &quot;sale/share&quot; under CPRA; GPC handling.</li>
            <li>Whether any sensitive data is processed beyond permitted purposes.</li>
            <li>Actual minimum-age handling and App Store age rating; under-16 consent flow.</li>
            <li>AI/profiling scope (Frequency Match) and opt-out mechanics.</li>
            <li>Whether a DPO and/or EU/UK Art. 27 Representative is legally required.</li>
            <li>Working consumer/data-subject request workflow and identity verification.</li>
            <li>Security measures as actually implemented.</li>
            <li>Signed Data Processing Agreements with each processor; documented sub-processor list.</li>
            <li>Records of Processing Activities (Art. 30) maintained.</li>
            <li>DPIA completed where processing is high-risk.</li>
            <li>Legitimate Interest Assessments documented for each LI basis.</li>
            <li>A postal contact address and (if incorporated) legal entity details.</li>
          </ul>
        </Section>

        {/* 26. Legal review */}
        <Section id="review" title="26. Legal Review Notes">
          <p>
            This document is a strong, structured draft — <strong className="text-on-surface">not
            legal advice</strong>. Please note:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>A qualified privacy lawyer or DPO should review it before you rely on it.</li>
            <li>The Policy must match your <em>actual</em> practices; inaccurate statements create legal and regulatory risk.</li>
            <li>Technical implementation must match the words here — especially cookie consent, opt-outs, GPC, deletion requests, and vendor data flows.</li>
            <li>We make no absolute guarantee of compliance or security; obligations differ by jurisdiction and processing.</li>
            <li>Resolve every <NeedsInput>…</NeedsInput> marker above before publishing.</li>
            <li>If Groupys incorporates, update the controller identity, address, and any representative/DPO details.</li>
          </ul>
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
