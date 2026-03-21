"use client";

import SectionHeader from "@/components/discover/SectionHeader";

interface Community {
  id: string;
  name: string;
  tagline: string;
  members: number;
  color: string;
  icon: string;
  isLive: boolean;
}

const communities: Community[] = [
  { id: "1", name: "Vinyl Heads", tagline: "Crate diggers & analog lovers", members: 12400, color: "#7c3aed", icon: "album", isLive: true },
  { id: "2", name: "Late Night Beats", tagline: "After-hours producers & DJs", members: 8700, color: "#be185d", icon: "dark_mode", isLive: false },
  { id: "3", name: "Synth Collective", tagline: "Modular jams & sound design", members: 5200, color: "#0891b2", icon: "graphic_eq", isLive: true },
  { id: "4", name: "Acoustic Sessions", tagline: "Stripped-back & soulful", members: 9100, color: "#b45309", icon: "local_cafe", isLive: false },
];

function formatMembers(count: number): string {
  if (count >= 1000)
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(count);
}

function CommunityCard({ community }: { community: Community }) {
  return (
    <button
      className="relative overflow-hidden rounded-2xl text-left transition-transform hover:scale-[0.98] active:scale-95"
      style={{ backgroundColor: community.color, minHeight: 120 }}
    >
      {/* Decorative icon */}
      <span
        className="material-symbols-outlined absolute -top-2 -right-2 text-white/10 select-none pointer-events-none"
        style={{ fontSize: 80, fontVariationSettings: "'FILL' 1" }}
      >
        {community.icon}
      </span>

      {/* Live badge */}
      {community.isLive && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">
            Live
          </span>
        </div>
      )}

      <div className="relative p-5 flex flex-col justify-end h-full">
        <h4 className="text-xl font-extrabold text-white mb-1">
          {community.name}
        </h4>
        <p className="text-xs text-white/70 font-medium mb-2">
          {community.tagline}
        </p>
        <div className="flex items-center gap-1.5">
          <span
            className="material-symbols-outlined text-white/70"
            style={{ fontSize: 14 }}
          >
            group
          </span>
          <span className="text-xs font-semibold text-white/70">
            {formatMembers(community.members)} members
          </span>
        </div>
      </div>
    </button>
  );
}

export default function CommunitiesSection() {
  return (
    <section className="mb-12 lg:mb-16">
      <SectionHeader title="Explore Communities" actionText="See All" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {communities.map((community) => (
          <CommunityCard key={community.id} community={community} />
        ))}
      </div>
    </section>
  );
}
