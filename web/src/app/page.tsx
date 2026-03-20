import NavBar from "@/components/landing/NavBar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import AppShowcase from "@/components/landing/AppShowcase";
import TrendingArtists from "@/components/landing/TrendingArtists";
import CtaSection from "@/components/landing/CtaSection";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="bg-surface text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed">
      <NavBar />
      <main className="pt-32">
        <HeroSection />
        <FeaturesSection />
        <AppShowcase />
        <TrendingArtists />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
