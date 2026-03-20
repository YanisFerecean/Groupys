export default function CtaSection() {
  return (
    <section className="py-32 px-8">
      <div className="max-w-5xl mx-auto bg-primary text-on-primary rounded-[3rem] p-16 md:p-24 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full -ml-48 -mb-48 blur-3xl"></div>
        <div className="relative z-10 space-y-8">
          <h2 className="text-5xl font-extrabold tracking-tight">
            Find your people through music.
          </h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Groupys is currently in private beta. Be among the first to join communities, match
            with listeners like you, and build your musical identity.
          </p>
          <div className="pt-8">
            <button className="px-10 py-5 bg-white text-primary rounded-full font-bold text-xl hover:scale-105 transition-transform shadow-xl shadow-black/10">
              Join Waitlist
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
