"use client";

import SectionHeader from "@/components/discover/SectionHeader";

interface DiscoverUser {
  id: string;
  name: string;
  image: string;
  nowListening: string;
  genres: string[];
  vibePercent: number;
}

const activeUsers: DiscoverUser[] = [
  { id: "1", name: "Zara K.", image: "https://picsum.photos/seed/zaraK/200/200", nowListening: "Frank Ocean", genres: ["R&B", "Alt"], vibePercent: 94 },
  { id: "2", name: "Luca M.", image: "https://picsum.photos/seed/lucaM/200/200", nowListening: "Tame Impala", genres: ["Psych", "Indie"], vibePercent: 88 },
  { id: "3", name: "Nia O.", image: "https://picsum.photos/seed/niaO/200/200", nowListening: "SZA", genres: ["Neo-Soul", "Pop"], vibePercent: 91 },
  { id: "4", name: "Kael R.", image: "https://picsum.photos/seed/kaelR/200/200", nowListening: "Bladee", genres: ["Hyperpop", "Cloud"], vibePercent: 79 },
  { id: "5", name: "Isla T.", image: "https://picsum.photos/seed/islaT/200/200", nowListening: "Ethel Cain", genres: ["Art Pop", "Dark"], vibePercent: 86 },
  { id: "6", name: "Dev N.", image: "https://picsum.photos/seed/devN/200/200", nowListening: "JPEGMAFIA", genres: ["Experimental", "Rap"], vibePercent: 82 },
];

function UserOnlineCard({ user }: { user: DiscoverUser }) {
  return (
    <button className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-outline-variant/30 bg-primary/5 hover:bg-primary/10 transition-colors w-36 shrink-0">
      {/* Avatar + online dot */}
      <div className="relative">
        <img
          src={user.image}
          alt={user.name}
          className="w-16 h-16 rounded-full object-cover"
        />
        <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-surface-container-low" />
      </div>

      {/* Name */}
      <p className="text-sm font-extrabold text-on-surface tracking-tight truncate w-full text-center">
        {user.name}
      </p>

      {/* Now listening */}
      <div className="flex items-center gap-1">
        <span
          className="material-symbols-outlined text-primary"
          style={{ fontSize: 12 }}
        >
          music_note
        </span>
        <span className="text-[11px] text-on-surface-variant font-medium truncate max-w-[6rem]">
          {user.nowListening}
        </span>
      </div>

      {/* Genre pills */}
      <div className="flex gap-1.5 flex-wrap justify-center">
        {user.genres.slice(0, 2).map((g) => (
          <span
            key={g}
            className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full"
          >
            {g}
          </span>
        ))}
      </div>
    </button>
  );
}

export default function WhosOnSection() {
  return (
    <section className="mb-12 lg:mb-16">
      <SectionHeader title="Who's On?" actionText="See All" />
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none">
        {activeUsers.map((user) => (
          <UserOnlineCard key={user.id} user={user} />
        ))}
      </div>
    </section>
  );
}
