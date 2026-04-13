import CommunitiesPreview from "./CommunitiesPreview";
import WaitlistForm from "./WaitlistForm";

export default function HeroSection() {
  return (
    <section className="max-w-7xl mx-auto px-6 sm:px-8 mb-16 md:mb-32 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
      <div className="lg:col-span-6 space-y-6 md:space-y-8">
        <h1 className="text-display-lg text-on-surface">
          Music is better<br />together.
        </h1>
        <p className="text-lg md:text-xl text-on-surface-variant max-w-lg leading-relaxed">
          Discover communities built around artists and genres. Connect with people who truly share your taste — and build a profile that shows who you are as a listener.
        </p>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {[
              { type: "img", src: "https://i.pravatar.cc/56?img=11" },
              { type: "initial", initial: "A", bg: "#6366f1" },
              { type: "img", src: "https://i.pravatar.cc/56?img=32" },
              { type: "initial", initial: "J", bg: "#10b981" },
              { type: "img", src: "https://i.pravatar.cc/56?img=47" },
            ].map((avatar, i) =>
              avatar.type === "img" ? (
                <img
                  key={i}
                  src={avatar.src}
                  alt="Waitlist member"
                  width={28}
                  height={28}
                  className="w-7 h-7 rounded-full border-2 border-white object-cover"
                />
              ) : (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: avatar.bg }}
                >
                  {avatar.initial}
                </div>
              )
            )}
          </div>
          <p className="text-sm font-semibold text-on-surface">
            Join <span className="text-primary">2,400+</span> music lovers already on the waitlist
          </p>
        </div>
        <WaitlistForm variant="light" />
        <a href="#features" className="text-sm font-semibold text-primary hover:underline">
          See Features →
        </a>
      </div>

      <div className="lg:col-span-6 relative">
        <CommunitiesPreview />
        <div className="absolute -z-10 -top-10 -right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -z-10 -bottom-10 -left-10 w-64 h-64 bg-secondary/5 rounded-full blur-3xl"></div>
      </div>
    </section>
  );
}
