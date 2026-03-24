"use client";

import { useState } from "react";
import Image from "next/image";

const communities = [
  {
    name: "Sad Girl Sanctuary",
    tags: ["Fan Club", "Memes"],
    members: "3.8k",
    posts: "912",
    image: "/lana-del-rey.png",
  },
  {
    name: "The Ocean",
    tags: ["Fan Club"],
    members: "3.2k",
    posts: "789",
    image: "/frank-ocean.png",
  },
  {
    name: "BadBunnies",
    tags: ["News", "Memes"],
    members: "4.9k",
    posts: "1.2k",
    image: "/bad-bunny.png",
  },
  {
    name: "Marvins Room",
    tags: ["Art", "Discussion"],
    members: "5.4k",
    posts: "1.4k",
    image: "/drake.png",
  },
];

const defaultTransforms = [
  "rotate(-18deg) translate(-64px, 40px)",
  "rotate(-5deg) translate(-36px, 20px)",
  "rotate(8deg) translate(-12px, 6px)",
  "rotate(20deg) translate(16px, -10px)",
];

// stackOrder[i] = card index at position i (0=back, 3=front)
const initialStack = [0, 1, 2, 3];

export default function CommunitiesPreview() {
  const [stackOrder, setStackOrder] = useState(initialStack);
  const [animating, setAnimating] = useState(false);

  function handleHover(cardIndex: number) {
    if (animating) return;
    const pos = stackOrder.indexOf(cardIndex);
    if (pos === stackOrder.length - 1) return; // already on top
    const newStack = [...stackOrder.filter((c) => c !== cardIndex), cardIndex];
    setStackOrder(newStack);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 500);
  }

  return (
    <div className="relative h-[420px] sm:h-[500px] max-w-[280px] mx-auto lg:ml-auto lg:mr-0 lg:-translate-x-[7.5rem]">
      {communities.map((c, i) => {
        const pos = stackOrder.indexOf(i);
        return (
          <div
            key={c.name}
            onMouseEnter={() => handleHover(i)}
            className="absolute inset-0 overflow-hidden rounded-2xl shadow-xl transition-all duration-500 cursor-pointer"
            style={{
              zIndex: pos,
              transform: defaultTransforms[pos],
              transformOrigin: "bottom center",
              pointerEvents: animating ? "none" : "auto",
            }}
          >
            <Image
              alt={c.name}
              src={c.image}
              fill
              className="object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, rgba(28,27,26,0) 40%, rgba(28,27,26,0.88) 100%)" }}
            />
            <div className="absolute bottom-0 left-0 p-5 w-full space-y-2">
              <div className="flex gap-1.5 flex-wrap">
                {c.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-white/20 backdrop-blur-sm text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="text-white text-2xl font-extrabold tracking-tight leading-tight">
                {c.name}
              </h3>
              <div className="flex gap-4 pt-1">
                {[
                  { value: c.members, label: "Members" },
                  { value: c.posts, label: "Posts" },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col">
                    <span className="text-white font-bold text-sm leading-tight">{s.value}</span>
                    <span className="text-white/60 text-[10px] uppercase tracking-widest font-semibold">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
