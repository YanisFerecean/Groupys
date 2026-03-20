const features = [
  {
    icon: "forum",
    title: "Music Communities",
    description:
      "Join or create spaces built around artists, genres, and scenes. Share tracks, concert reviews, and discoveries — as text, links, or uploads.",
    cta: "Explore communities",
  },
  {
    icon: "favorite",
    title: "Taste Match",
    description:
      "Two profiles placed side by side based on taste overlap — shared genres, common artists, similar listening habits. Swipe to connect.",
    cta: "See how it works",
  },
  {
    icon: "auto_stories",
    title: "Weekly Check-in",
    description:
      "Every Monday, five short questions about your week in music. Share your answers publicly and give your profile a living, breathing feel.",
    cta: "See an example",
  },
];

export default function FeaturesSection() {
  return (
    <section className="bg-surface-container-low py-20 md:py-32" id="features">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="mb-12 md:mb-20">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Built around music. Built around people.</h2>
          <p className="text-on-surface-variant max-w-md">
            Everything on Groupys starts with a shared love of sound.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-surface-container-lowest p-6 md:p-10 rounded-3xl md:rounded-[2rem] hover:-translate-y-2 transition-all duration-300"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-8">
                <span className="material-symbols-outlined text-primary text-3xl">{f.icon}</span>
              </div>
              <h3 className="text-xl font-bold mb-4">{f.title}</h3>
              <p className="text-on-surface-variant leading-relaxed mb-6">{f.description}</p>
              <a className="text-primary font-bold inline-flex items-center gap-2 group" href="#">
                {f.cta}{" "}
                <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
