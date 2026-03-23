import CommunitiesPreview from "./CommunitiesPreview";

export default function HeroSection() {
  return (
    <section className="max-w-7xl mx-auto px-6 sm:px-8 mb-16 md:mb-32 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
      <div className="lg:col-span-6 space-y-6 md:space-y-8">
        <h1 className="text-display-lg text-on-surface">
          Music is better<br />together.
        </h1>
        <p className="text-lg md:text-xl text-on-surface-variant max-w-lg leading-relaxed">
          Join communities built around artists and genres. Connect with people who share your taste. Build a profile that stands out — showcase what makes you different.
        </p>
        <div className="flex flex-wrap gap-3 md:gap-4 pt-2 md:pt-4">
          <a href="#cta" className="px-6 py-3 md:px-8 md:py-4 bg-primary text-on-primary rounded-full font-bold text-base md:text-lg hover:shadow-xl hover:shadow-primary/20 transition-all">
            Join Waitlist
          </a>
          <a href="#features" className="px-6 py-3 md:px-8 md:py-4 bg-surface-container-high text-on-surface rounded-full font-bold text-base md:text-lg hover:bg-surface-container-highest transition-all">
            See Features
          </a>
        </div>
      </div>

      <div className="lg:col-span-6 relative">
        <CommunitiesPreview />
        <div className="absolute -z-10 -top-10 -right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -z-10 -bottom-10 -left-10 w-64 h-64 bg-secondary/5 rounded-full blur-3xl"></div>
      </div>
    </section>
  );
}
