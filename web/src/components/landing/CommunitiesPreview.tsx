"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

const communities = [
  {
    name: "Sad Girl Sanctuary",
    tags: ["Fan Club", "Memes"],
    members: "3.8k",
    posts: "912",
    image: "/lana-del-rey.jpg",
  },
  {
    name: "The Ocean",
    tags: ["Fan Club"],
    members: "3.2k",
    posts: "789",
    image: "/frank-ocean.jpg",
  },
  {
    name: "BadBunnies",
    tags: ["News", "Memes"],
    members: "4.9k",
    posts: "1.2k",
    image: "/bad-bunny.jpg",
  },
  {
    name: "Marvins Room",
    tags: ["Art", "Discussion"],
    members: "5.4k",
    posts: "1.4k",
    image: "/drake.jpg",
  },
];

const mobilePositions = [
  { rotate: -10, x: -20, y: 16 },
  { rotate: -3, x: -10, y: 8 },
  { rotate: 4, x: -2, y: 2 },
  { rotate: 12, x: 8, y: -4 },
];

const desktopPositions = [
  { rotate: -18, x: -64, y: 40 },
  { rotate: -5, x: -36, y: 20 },
  { rotate: 8, x: -12, y: 6 },
  { rotate: 20, x: 16, y: -10 },
];

// stackOrder[i] = card index at position i (0=back, 3=front)
const initialStack = [0, 1, 2, 3];

export default function CommunitiesPreview() {
  const [stackOrder, setStackOrder] = useState(initialStack);
  const [pullingCard, setPullingCard] = useState<number | null>(null);

  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;
  const positions = isMobile ? mobilePositions : desktopPositions;

  function handleClick(e: React.MouseEvent, cardIndex: number) {
    e.stopPropagation();
    if (pullingCard !== null) return;
    const pos = stackOrder.indexOf(cardIndex);
    if (pos === stackOrder.length - 1) return; // already on top

    setPullingCard(cardIndex);
    setTimeout(() => {
      setStackOrder((prev) => [...prev.filter((c) => c !== cardIndex), cardIndex]);
      setPullingCard(null);
    }, 350);
  }

  const activeCard = stackOrder[stackOrder.length - 1];

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-[200px] sm:max-w-[300px] mx-auto lg:ml-auto lg:mr-0 lg:-translate-x-[7.5rem]">
    <div className="relative h-[280px] sm:h-[500px] w-full">
      {communities.map((c, i) => {
        const pos = stackOrder.indexOf(i);
        const isPulling = pullingCard === i;

        return (
          <motion.div
            key={c.name}
            onClick={(e) => handleClick(e, i)}
            className="absolute inset-0 overflow-hidden rounded-2xl shadow-xl cursor-pointer"
            animate={
              isPulling
                ? { rotate: -20, x: -(isMobile ? 180 - pos * 25 : 350 - pos * 50), y: -30, scale: 1.05 }
                : { rotate: positions[pos].rotate, x: positions[pos].x, y: positions[pos].y, scale: 1 }
            }
            transition={
              isPulling
                ? { duration: 0.35, ease: "easeOut" }
                : { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }
            }
            style={{
              zIndex: pos,
              transformOrigin: "bottom center",
              pointerEvents: pullingCard !== null ? "none" : "auto",
            }}
          >
            <Image
              alt={c.name}
              src={c.image}
              fill
              className="object-cover"
              sizes="(max-width: 639px) 400px, 900px"
              quality={75}
              priority={pos === communities.length - 1}
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, rgba(28,27,26,0) 40%, rgba(28,27,26,0.88) 100%)" }}
            />
            <div className="absolute bottom-0 left-0 p-3 sm:p-5 w-full space-y-1.5 sm:space-y-2">
              <div className="flex gap-1.5 flex-wrap">
                {c.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-white/20 backdrop-blur-sm text-white px-1.5 py-0.5 sm:px-2.5 rounded-full text-[8px] sm:text-[10px] font-bold tracking-widest uppercase"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="text-white text-lg sm:text-2xl font-extrabold tracking-tight leading-tight">
                {c.name}
              </h3>
              <div className="flex gap-3 sm:gap-4 pt-0.5 sm:pt-1">
                {[
                  { value: c.members, label: "Members" },
                  { value: c.posts, label: "Posts" },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col">
                    <span className="text-white font-bold text-xs sm:text-sm leading-tight">{s.value}</span>
                    <span className="text-white/60 text-[8px] sm:text-[10px] uppercase tracking-widest font-semibold">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
    <div className="relative z-10 flex gap-2 mt-20 self-start ml-16">
      {communities.map((_, i) => (
        <button
          key={i}
          onClick={(e) => handleClick(e, i)}
          className={`rounded-full transition-all duration-300 ${
            activeCard === i
              ? "w-4 h-2 bg-foreground"
              : "w-2 h-2 bg-foreground/25 hover:bg-foreground/50"
          }`}
        />
      ))}
    </div>
    </div>
  );
}
