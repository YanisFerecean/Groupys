const mockupSrc =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAkpclHoGjz5wY5yadVHRVWCoT-Cd7ZSB6USQMIlZTZeowEUyyeEVE8DSrpyzds0ayxfu9GSyXOJZbMvzbNPLoRJ3TLN31hynK5Dm2qB4feOmGGfo7H1Sb7uJifAXnfR6O06QwAZvn7ctg8DLxD_v-__DHbroQLJFUm1kLzLEI4-Cg1Ha7_ZIYBCYSX4A_75DdD9rIzP2kUZl_SD-4puWVt3JHLil8DzE4MZCjneB0eyaX_UTE3mUD_4AkC_6TfBulXCBvgLIdRgyE";

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
    title: "Weekly Check-in",
    description:
      "Five rotating questions, every Monday. Never longer than 60 seconds. Share publicly to spark conversations.",
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
            <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden">
              <img alt="Groupys mobile app" className="w-full h-full object-cover" src={mockupSrc} />
            </div>
          </div>
          {/* Secondary mockup — hidden on small screens to avoid overflow */}
          <div className="hidden sm:block absolute z-10 top-20 -right-4 lg:right-10 w-[200px] h-[420px] sm:w-[240px] sm:h-[500px] md:w-[280px] md:h-[580px] bg-on-surface rounded-[3rem] p-3 shadow-2xl overflow-hidden border-4 border-surface-container-high opacity-80 scale-90">
            <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden">
              <img alt="Groupys community feed" className="w-full h-full object-cover" src={mockupSrc} />
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
