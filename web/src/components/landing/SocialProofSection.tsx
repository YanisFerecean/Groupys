const stats = [
  { value: "2,400+", label: "Waitlist" },
  { value: "Free", label: "During Beta" },
  { value: "iOS & Android", label: "Coming Soon" },
];

const testimonials = [
  {
    initials: "YF",
    name: "Yanis Ferecean",
    quote: "bro i found my entire friend group through this app. we all had the same top artists and now we literally hang out irl. groupys is genuinely unhinged (in a good way)",
  },
  {
    initials: "HB",
    name: "Hamza Becirovic",
    quote: "the hot takes section has me in a chokehold. someone said tame impala is overrated and the whole app lost it. this is the only social media i actually open voluntarily",
  },
  {
    initials: "MM",
    name: "Milad Moradi",
    quote: "finally an app that gets that music taste is a personality. my frequency score matched me with people who also think currents is a top 5 album of all time. we're besties now",
  },
];

export default function SocialProofSection() {
  return (
    <section className="py-16 md:py-24 px-6 sm:px-8 border-t border-surface-container">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Stat counters */}
        <div className="grid grid-cols-3 gap-4 md:gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label} className="space-y-1">
              <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-primary">{s.value}</p>
              <p className="text-xs sm:text-sm text-on-surface-variant font-medium uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-surface-container rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                  {t.initials}
                </div>
                <div>
                  <p className="font-semibold text-on-surface text-sm">{t.name}</p>
                  <p className="text-xs text-on-surface-variant">Beta Tester</p>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
