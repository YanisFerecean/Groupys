"use client";

import { useState } from "react";
import FeedHeroCard from "@/components/feed/FeedHeroCard";
import FeedEditorialCard from "@/components/feed/FeedEditorialCard";

const tabs = ["Communitys", "Friends"] as const;

export default function FeedContent() {
  const [activeTab, setActiveTab] = useState<string>(tabs[0]);

  return (
    <section className="flex-1 max-w-4xl px-6 lg:px-12 py-8 lg:py-12">
      <header className="mb-12 lg:mb-16">
        <h2 className="text-display-lg mb-2">Community Feed</h2>
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={
                activeTab === tab
                  ? "text-primary font-bold text-sm"
                  : "text-on-surface-variant/60 font-medium text-sm hover:text-on-surface transition-colors"
              }
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <FeedHeroCard
        title="Midnight City Visions"
        artist="Digital Nomads"
        album="Neon Horizon EP"
        quality="Hi-Res Lossless"
        verified
        likes="1.2k"
        comments={84}
        listeners={12}
      />

      <FeedEditorialCard
        label="New Collective Drop"
        title="Atmospheric Textures in Modern Jazz"
        description="A deep dive into the 2024 minimalist revival from the streets of Tokyo to the clubs of Berlin."
        curator="The Echo Chamber"
      />
    </section>
  );
}
