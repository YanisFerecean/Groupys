"use client";

import { useState, useSyncExternalStore } from "react";
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

const mobileTransforms = [
  "rotate(-10deg) translate(-20px, 16px)",
  "rotate(-3deg) translate(-10px, 8px)",
  "rotate(4deg) translate(-2px, 2px)",
  "rotate(12deg) translate(8px, -4px)",
];

const desktopTransforms = [
  "rotate(-18deg) translate(-64px, 40px)",
  "rotate(-5deg) translate(-36px, 20px)",
  "rotate(8deg) translate(-12px, 6px)",
  "rotate(20deg) translate(16px, -10px)",
];

// stackOrder[i] = card index at position i (0=back, 3=front)
const initialStack = [0, 1, 2, 3];

const mobileQuery = "(max-width: 639px)";
function subscribeMobile(cb: () => void) {
  const mql = window.matchMedia(mobileQuery);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}
function getIsMobile() {
  return window.matchMedia(mobileQuery).matches;
}
function getIsMobileServer() {
  return false;
}

export default function CommunitiesPreview() {
  const [stackOrder, setStackOrder] = useState(initialStack);
  const [animating, setAnimating] = useState(false);
  const isMobile = useSyncExternalStore(subscribeMobile, getIsMobile, getIsMobileServer);

  const transforms = isMobile ? mobileTransforms : desktopTransforms;

  function handleHover(cardIndex: number) {
    if (animating) return;
    const pos = stackOrder.indexOf(cardIndex);
    if (pos === stackOrder.length - 1) return; // already on top
    const newStack = [...stackOrder.filter((c) => c !== cardIndex), cardIndex];
    setStackOrder(newStack);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 500);
  }

  function handleTap(e: React.MouseEvent, cardIndex: number) {
    e.stopPropagation();
    handleHover(cardIndex);
  }

  return (
    <div className="relative h-[280px] sm:h-[500px] w-full max-w-[200px] sm:max-w-[300px] mx-auto lg:ml-auto lg:mr-0 lg:-translate-x-[7.5rem]">
      {communities.map((c, i) => {
        const pos = stackOrder.indexOf(i);
        return (
          <div
            key={c.name}
            onMouseEnter={() => !isMobile && handleHover(i)}
            onClick={(e) => isMobile && handleTap(e, i)}
            className="absolute inset-0 overflow-hidden rounded-2xl shadow-xl transition-all duration-500 cursor-pointer"
            style={{
              zIndex: pos,
              transform: transforms[pos],
              transformOrigin: "bottom center",
              pointerEvents: animating ? "none" : "auto",
            }}
          >
            <Image
              alt={c.name}
              src={c.image}
              fill
              className="object-cover"
              sizes="(max-width: 639px) 400px, 900px"
              quality={90}
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
          </div>
        );
      })}
    </div>
  );
}
