export default function HeroSection() {
  return (
    <section className="max-w-7xl mx-auto px-8 mb-32 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
      <div className="lg:col-span-6 space-y-8">
        <h1 className="text-display-lg text-on-surface">
          Music is better<br />together.
        </h1>
        <p className="text-xl text-on-surface-variant max-w-lg leading-relaxed">
          Join communities built around artists and genres. Match with people who share your taste. Reflect on what you listened to this week.
        </p>
        <div className="flex flex-wrap gap-4 pt-4">
          <button className="px-8 py-4 bg-primary text-on-primary rounded-full font-bold text-lg hover:shadow-xl hover:shadow-primary/20 transition-all">
            Join the Waitlist
          </button>
          <button className="px-8 py-4 bg-surface-container-high text-on-surface rounded-full font-bold text-lg hover:bg-surface-container-highest transition-all">
            See Features
          </button>
        </div>
      </div>

      <div className="lg:col-span-6 relative">
        <div className="relative rounded-[2.5rem] overflow-hidden bg-surface-container-low aspect-square shadow-2xl">
          <img
            alt="Groupys Discovery Map UI"
            className="w-full h-full object-cover opacity-90"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDU1JkKqTTI32EON1PXWd7F5UVlGF4CNSVedCJH5tUZJixYHxkZK27Yyq_a4YumZmYZo2TnNYZ5fJg8gBnCCiawx4h91DMswnemtj2WQjt12l_azzNBEERzJve--ie5M5uUe2Uq0s4dd1x5JbavVp6HcDdOvSbamO2G2mjXmjGkHgi_2X1psQyQzNOuKgNobsmlz4jc6z9kn5FH9IYNlc-iu2_0t7Zp0IJaNli0-jZwvWenG6MwnbFLNnOwWk4RQYnEteNF2uL84Lk"
          />
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="w-full h-full glass-nav rounded-3xl border border-white/20 p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="bg-white/90 px-4 py-2 rounded-full shadow-sm text-sm font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">favorite</span>
                  Taste Match
                </div>
                <div className="bg-white/90 px-4 py-2 rounded-full shadow-sm text-sm font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  92% match
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-white/95 p-4 rounded-2xl shadow-lg transform translate-x-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                      <img
                        alt="User profile"
                        className="w-full h-full object-cover"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAkpclHoGjz5wY5yadVHRVWCoT-Cd7ZSB6USQMIlZTZeowEUyyeEVE8DSrpyzds0ayxfu9GSyXOJZbMvzbNPLoRJ3TLN31hynK5Dm2qB4feOmGGfo7H1Sb7uJifAXnfR6O06QwAZvn7ctg8DLxD_v-__DHbroQLJFUm1kLzLEI4-Cg1Ha7_ZIYBCYSX4A_75DdD9rIzP2kUZl_SD-4puWVt3JHLil8DzE4MZCjneB0eyaX_UTE3mUD_4AkC_6TfBulXCBvgLIdRgyE"
                      />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Hana Sato</p>
                      <p className="text-xs text-on-surface-variant">Album of the Week: Currents</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/95 p-4 rounded-2xl shadow-lg transform -translate-x-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                      <img
                        alt="User profile"
                        className="w-full h-full object-cover"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDszPpmADE3mzvd3KOi82uO25kvBpDH9nAXiXLFDN812az0bQF7W1_1X0x9N954QkwRSiuB1qIp5QwHRZrzbXuzWV0S_zj6xaYwizhxTgvPF5YbCeEvBIiSvaUmC8qmrRd98Z5uANyGz8pc_6pgqpmTDy3De1YnJUHBE5mRLjm7ZPND5FAQ7TFKH0T19SToaul-a1F0EbxKlHA-RvlF2ECIIoDSao0g9HnApRDqN-3ImR2V5-BqLtbO78Tzr0T3VybpJSZy1JWnZGw"
                      />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Kenji Chen</p>
                      <p className="text-xs text-on-surface-variant">Shared artists: Tame Impala, Bicep</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -z-10 -top-10 -right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -z-10 -bottom-10 -left-10 w-64 h-64 bg-secondary/5 rounded-full blur-3xl"></div>
      </div>
    </section>
  );
}
