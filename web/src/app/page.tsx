import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import NavBar from "@/components/landing/NavBar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import SocialProofSection from "@/components/landing/SocialProofSection";
import LogoCarousel from "@/components/landing/LogoCarousel";
import AppShowcase from "@/components/landing/AppShowcase";
import TrendingArtists from "@/components/landing/TrendingArtists";
import FaqSection from "@/components/landing/FaqSection";
import CtaSection from "@/components/landing/CtaSection";
import Footer from "@/components/landing/Footer";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-WG945YLN9C";

export const metadata: Metadata = {
  title: "Groupys – Find Your Music Community | Connect with Music Lovers",
  description:
    "Groupys is the music community app where you connect with music lovers, join music fan communities, rate albums with our album rating app, and discover your music social network.",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
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
    },
    {
      "@type": "WebPage",
      "@id": "https://groupys.app/#webpage",
      url: "https://groupys.app",
      name: "Groupys – Find Your Music Community | Connect with Music Lovers",
      description:
        "Groupys is a community-based music platform. Join communities, match with people who share your taste, rate albums, and share weekly hot takes.",
      isPartOf: { "@id": "https://groupys.app/#website" },
      about: { "@id": "https://groupys.app/#app" },
      publisher: { "@id": "https://groupys.app/#organization" },
    },
    {
      "@type": "Organization",
      "@id": "https://groupys.app/#organization",
      name: "Groupys",
      url: "https://groupys.app",
      logo: {
        "@type": "ImageObject",
        url: "https://groupys.app/og-image.png",
        width: 512,
        height: 512,
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
      "@type": "SoftwareApplication",
      "@id": "https://groupys.app/#app",
      name: "Groupys",
      url: "https://groupys.app",
      operatingSystem: "iOS, Android",
      applicationCategory: "MusicApplication",
      description:
        "Join music communities, match with people who share your taste, rate albums track by track, and share weekly hot takes.",
      featureList: [
        "Music communities",
        "Frequency Match — taste compatibility scoring",
        "Track-by-track album ratings",
        "Weekly Hot Take",
        "Custom profile with Album of the Week",
      ],
      screenshot: [
        { "@type": "ImageObject", url: "https://groupys.app/phone_1.png" },
        { "@type": "ImageObject", url: "https://groupys.app/phone_2.png" },
      ],
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@id": "https://groupys.app/#organization" },
      author: { "@id": "https://groupys.app/#organization" },
    },
    {
      "@type": "WebApplication",
      name: "Groupys",
      description:
        "Find your music community. Connect with people who share your taste.",
      applicationCategory: "SocialNetworkingApplication",
      url: "https://groupys.app",
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Groupys?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Groupys is a community-based music platform where you can join music communities, rate albums and tracks, match with people who share your taste, and share weekly hot takes about what you're listening to.",
          },
        },
        {
          "@type": "Question",
          name: "How does Frequency Match work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Frequency Match compares your genre preferences, favourite artists, and listening habits against other users to generate a compatibility score.",
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
          name: "What is the Weekly Hot Take?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Once a week, post your take on an album, artist, or trend. It shows up on your profile so others can see where you stand.",
          },
        },
        {
          "@type": "Question",
          name: "How do music communities work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Communities are genre or artist-based spaces where members post, comment, rate albums, and discuss music. Each community is built around a shared taste — whether that's an artist, a genre, or a vibe.",
          },
        },
      ],
    },
  ],
};

export default function Home() {
  return (
    <>
      {GA_ID ? <GoogleAnalytics gaId={GA_ID} /> : null}
      {/* Preload LCP image — top card in CommunitiesPreview is always drake.jpg on initial render */}
      <link
        rel="preload"
        as="image"
        href="/_next/image?url=%2Fdrake.png&w=384&q=75"
        imageSrcSet="/_next/image?url=%2Fdrake.png&w=256&q=75 256w, /_next/image?url=%2Fdrake.png&w=384&q=75 384w"
        imageSizes="280px"
      />
<script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
      <div className="bg-surface text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed">
        <NavBar />
        <main className="pt-24 md:pt-32">
          <HeroSection />
          <LogoCarousel />
          <SocialProofSection />
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
