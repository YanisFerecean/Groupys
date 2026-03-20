const curators = [
  {
    name: "Julian V.",
    role: "Analog Enthusiast",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAkpclHoGjz5wY5yadVHRVWCoT-Cd7ZSB6USQMIlZTZeowEUyyeEVE8DSrpyzds0ayxfu9GSyXOJZbMvzbNPLoRJ3TLN31hynK5Dm2qB4feOmGGfo7H1Sb7uJifAXnfR6O06QwAZvn7ctg8DLxD_v-__DHbroQLJFUm1kLzLEI4-Cg1Ha7_ZIYBCYSX4A_75DdD9rIzP2kUZl_SD-4puWVt3JHLil8DzE4MZCjneB0eyaX_UTE3mUD_4AkC_6TfBulXCBvgLIdRgyE",
  },
  {
    name: "Amara Okafor",
    role: "Deep House Curator",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAkpclHoGjz5wY5yadVHRVWCoT-Cd7ZSB6USQMIlZTZeowEUyyeEVE8DSrpyzds0ayxfu9GSyXOJZbMvzbNPLoRJ3TLN31hynK5Dm2qB4feOmGGfo7H1Sb7uJifAXnfR6O06QwAZvn7ctg8DLxD_v-__DHbroQLJFUm1kLzLEI4-Cg1Ha7_ZIYBCYSX4A_75DdD9rIzP2kUZl_SD-4puWVt3JHLil8DzE4MZCjneB0eyaX_UTE3mUD_4AkC_6TfBulXCBvgLIdRgyE",
  },
  {
    name: "Marcus Thorne",
    role: "Jazz Historian",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAkpclHoGjz5wY5yadVHRVWCoT-Cd7ZSB6USQMIlZTZeowEUyyeEVE8DSrpyzds0ayxfu9GSyXOJZbMvzbNPLoRJ3TLN31hynK5Dm2qB4feOmGGfo7H1Sb7uJifAXnfR6O06QwAZvn7ctg8DLxD_v-__DHbroQLJFUm1kLzLEI4-Cg1Ha7_ZIYBCYSX4A_75DdD9rIzP2kUZl_SD-4puWVt3JHLil8DzE4MZCjneB0eyaX_UTE3mUD_4AkC_6TfBulXCBvgLIdRgyE",
  },
  {
    name: "Elena Rossi",
    role: "Global Sounds",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuD_D-KLFT3KYVaRJsv9Hh_9WKfdwVFL3N1vMQoSU1yYwgO_w4OVpyeGSGocU2WFfU4sNwWpMVZ4EU7PuCe9smOYVyz2I70YdUinF4-Qr-oeqLZZOoBs-2GjyD5DmxAAnDXy8xManEgd_hFruZRZ8_7xScxLnldUZZ8XPoTpOANK7zHDRdw6_KsLh6F2LQfR53gL4MCkaJWWz-nD45EnT-X8MP9m3OeleMEVzANgxB04qsqVJ2g1VAqWlVPhOvAGXOcxBzoMhI1vXFc",
  },
];

export default function CuratorSpotlights() {
  return (
    <section className="py-32 border-t border-surface-container" id="community">
      <div className="max-w-7xl mx-auto px-8">
        <div className="text-center mb-20">
          <h2 className="text-3xl font-bold mb-4">Meet the Community</h2>
          <p className="text-on-surface-variant">The listeners already shaping what Groupys sounds like.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {curators.map((curator) => (
            <div key={curator.name} className="text-center group">
              <div className="aspect-square rounded-full overflow-hidden mb-6 ring-offset-4 ring-transparent group-hover:ring-primary/20 ring-4 transition-all duration-500">
                <img
                  alt={`${curator.name} profile`}
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  src={curator.src}
                />
              </div>
              <h4 className="font-bold">{curator.name}</h4>
              <p className="text-xs text-on-surface-variant uppercase tracking-widest font-semibold mt-1">
                {curator.role}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
