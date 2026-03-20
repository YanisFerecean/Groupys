import type { Metadata } from "next";
import NavBar from "@/components/landing/NavBar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import AppShowcase from "@/components/landing/AppShowcase";
import TrendingArtists from "@/components/landing/TrendingArtists";
import FaqSection from "@/components/landing/FaqSection";
import CtaSection from "@/components/landing/CtaSection";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Groupys – Music is better together",
  description:
    "Groupys is a community-based music platform. Join communities, match with people who share your taste, rate albums, and share weekly check-ins.",
  alternates: { canonical: "https://groupys.app" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://groupys.app/#website",
      url: "https://groupys.app",
      name: "Groupys",
      description: "A community-based music platform.",
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: "https://groupys.app/search?q={search_term_string}" },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": "https://groupys.app/#organization",
      name: "Groupys",
      url: "https://groupys.app",
      logo: {
        "@type": "ImageObject",
        url: "https://groupys.app/og-image.png",
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: "privacy@groupys.app",
        contactType: "customer support",
      },
      sameAs: [
        "https://www.instagram.com/groupysapp",
        "https://twitter.com/groupysapp",
      ],
    },
    {
      "@type": "MobileApplication",
      "@id": "https://groupys.app/#app",
      name: "Groupys",
      operatingSystem: "iOS, Android",
      applicationCategory: "MusicApplication",
      description:
        "Join music communities, match with people who share your taste, rate albums track by track, and share weekly check-ins.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Groupys?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Groupys is a community-based music platform where you can join music communities, rate albums and tracks, match with people who share your taste, and share weekly check-ins about what you're listening to.",
          },
        },
        {
          "@type": "Question",
          name: "How does Taste Match work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Taste Match compares your genre preferences, favourite artists, and listening habits against other users to generate a compatibility score.",
          },
        },
        {
          "@type": "Question",
          name: "Is Groupys free?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Groupys is currently in private beta and free for all users.",
          },
        },
        {
          "@type": "Question",
          name: "What is the Weekly Check-in?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Every Monday you receive five short rotating questions about what you're listening to. It takes under 60 seconds.",
          },
        },
      ],
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="bg-surface text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed">
        <NavBar />
        <main className="pt-24 md:pt-32">
          <HeroSection />
          <FeaturesSection />
          <AppShowcase />
          <TrendingArtists />
          <FaqSection />
          <CtaSection />
        </main>
        <Footer />
      </div>
    </>
  );
}
