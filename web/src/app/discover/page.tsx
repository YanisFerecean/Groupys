import type { Metadata } from "next";
import TrendingArtistsSection from "@/components/discover/TrendingArtistsSection";

export const metadata: Metadata = {
  title: "Discover",
  description: "Explore trending artists, music communities, and find people who share your taste.",
  robots: { index: false, follow: false },
};
import CommunitiesSection from "@/components/discover/CommunitiesSection";
import WhosOnSection from "@/components/discover/WhosOnSection";

export default function DiscoverPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-12 py-8 lg:py-12">
      <header className="mb-12 lg:mb-16">
        <h2 className="text-display-lg text-primary">Tap In</h2>
      </header>

      <TrendingArtistsSection />
      <CommunitiesSection />
      <WhosOnSection />
    </div>
  );
}
