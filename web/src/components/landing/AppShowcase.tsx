import Image from "next/image";

const mockupSrc = "/phone_1.jpg";
const mockupSrc2 = "/phone_2.jpg";

const highlights = [
  {
    title: "Your Profile, Your Identity",
    description:
      "Custom background, banner, colored username — and an Album of the Week that says more about you than any bio.",
  },
  {
    title: "Rate Every Album",
    description:
      "Go song by song through any album. Build a personal record of everything you've heard and how it made you feel.",
  },
  {
    title: "Weekly Hot Take",
    description:
      "Drop your takes each week and pin them to your profile. A living record of your musical opinions.",
  },
];

export default function AppShowcase() {
  return (
    <section className="py-24 md:py-40 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-20 items-center">
        {/* Mockups */}
        <div className="relative flex justify-center lg:justify-start min-h-[340px] sm:min-h-[480px] md:min-h-[620px]">
          {/* Primary mockup */}
          <div className="relative z-20 w-[200px] h-[420px] sm:w-[240px] sm:h-[500px] md:w-[280px] md:h-[580px] bg-on-surface rounded-[3rem] p-3 shadow-2xl overflow-hidden border-4 border-surface-container-high">
            <div className="relative w-full h-full bg-white rounded-[2.5rem] overflow-hidden">
              <Image alt="Groupys mobile app" fill className="object-cover" src={mockupSrc} sizes="(max-width: 640px) 200px, (max-width: 768px) 240px, 280px" />
            </div>
          </div>
          {/* Secondary mockup — hidden on small screens to avoid overflow */}
          <div className="hidden sm:block absolute z-10 top-20 -right-4 lg:right-10 w-[200px] h-[420px] sm:w-[240px] sm:h-[500px] md:w-[280px] md:h-[580px] bg-on-surface rounded-[3rem] p-3 shadow-2xl overflow-hidden border-4 border-surface-container-high opacity-80 scale-90">
            <div className="relative w-full h-full bg-white rounded-[2.5rem] overflow-hidden">
              <Image alt="Groupys community feed" fill className="object-cover" src={mockupSrc2} sizes="(max-width: 640px) 200px, (max-width: 768px) 240px, 280px" />
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-8 md:space-y-10">
          <span className="bg-primary/10 text-primary px-4 py-2 rounded-full font-bold tracking-widest text-xs uppercase">
            Your musical self
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
            A profile that actually reflects who you are.
          </h2>
          <p className="text-lg md:text-xl text-on-surface-variant leading-relaxed">
            Groupys gives you the tools to express your taste — not just show it off. Every detail
            of your profile tells a story.
          </p>
          <div className="space-y-5 md:space-y-6">
            {highlights.map((h) => (
              <div key={h.title} className="flex items-start gap-4">
                <span
                  className="material-symbols-outlined text-primary mt-1 shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <div>
                  <h4 className="font-bold">{h.title}</h4>
                  <p className="text-on-surface-variant">{h.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
