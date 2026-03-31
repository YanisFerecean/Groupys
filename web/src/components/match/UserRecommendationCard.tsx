"use client";

import { useRef, forwardRef, useImperativeHandle } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Users, Globe } from "lucide-react";
import type { SuggestedUser } from "@/types/match";
import Image from "next/image";

const SWIPE_THRESHOLD = 120;
const FLY_OUT_DISTANCE = 1200;

export interface CardHandle {
  swipeRight: () => void;
  swipeLeft: () => void;
}

interface Props {
  user: SuggestedUser;
  stackIndex: number;
  onLike: () => void;
  onDismiss: () => void;
}

const UserRecommendationCard = forwardRef<CardHandle, Props>(
  ({ user, stackIndex, onLike, onDismiss }, ref) => {
    const x = useMotionValue(0);
    const isDragging = useRef(false);

    const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);
    const likeOpacity = useTransform(x, [0, SWIPE_THRESHOLD * 0.5], [0, 1]);
    const passOpacity = useTransform(x, [-SWIPE_THRESHOLD * 0.5, 0], [1, 0]);

    const scale = 1 - stackIndex * 0.04;
    const yOffset = stackIndex * 12;

    useImperativeHandle(ref, () => ({
      swipeRight: () => {
        animate(x, FLY_OUT_DISTANCE, {
          duration: 0.28,
          ease: "easeOut",
          onComplete: onLike,
        });
      },
      swipeLeft: () => {
        animate(x, -FLY_OUT_DISTANCE, {
          duration: 0.28,
          ease: "easeOut",
          onComplete: onDismiss,
        });
      },
    }));

    const vibePercent = Math.round(user.score * 100);
    const isInteractive = stackIndex === 0;

    return (
      <motion.div
        style={{
          x: isInteractive ? x : 0,
          rotate: isInteractive ? rotate : 0,
          scale,
          y: isInteractive ? 0 : yOffset,
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          touchAction: "none",
          backgroundColor: "#1e1e1e",
        }}
        drag={isInteractive ? "x" : false}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.7}
        onDragStart={() => { isDragging.current = true; }}
        onDragEnd={(_, info) => {
          isDragging.current = false;
          const shouldLike = info.offset.x > SWIPE_THRESHOLD || info.velocity.x > 600;
          const shouldDismiss = info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -600;

          if (shouldLike) {
            animate(x, FLY_OUT_DISTANCE, {
              duration: 0.28,
              ease: "easeOut",
              onComplete: onLike,
            });
          } else if (shouldDismiss) {
            animate(x, -FLY_OUT_DISTANCE, {
              duration: 0.28,
              ease: "easeOut",
              onComplete: onDismiss,
            });
          } else {
            animate(x, 0, { type: "spring", damping: 15, stiffness: 200 });
          }
        }}
        className="rounded-[28px] overflow-hidden cursor-grab active:cursor-grabbing select-none"
      >
        {/* Profile image */}
        {user.profileImage ? (
          <Image
            src={user.profileImage}
            alt={user.displayName ?? user.username}
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e]">
            <svg width="96" height="96" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
          </div>
        )}

        {/* Bottom gradient overlay */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: "60%",
            background: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.88) 100%)",
          }}
        />

        {/* LIKE stamp */}
        <motion.div
          style={{ opacity: isInteractive ? likeOpacity : 0 }}
          className="absolute top-11 left-5 pointer-events-none"
        >
          <div
            style={{
              border: "3px solid #4ade80",
              borderRadius: 10,
              paddingLeft: 14,
              paddingRight: 14,
              paddingTop: 6,
              paddingBottom: 6,
              transform: "rotate(-18deg)",
            }}
          >
            <span style={{ color: "#4ade80", fontWeight: 900, fontSize: 24, letterSpacing: 2 }}>
              LIKE
            </span>
          </div>
        </motion.div>

        {/* PASS stamp */}
        <motion.div
          style={{ opacity: isInteractive ? passOpacity : 0 }}
          className="absolute top-11 right-5 pointer-events-none"
        >
          <div
            style={{
              border: "3px solid #f87171",
              borderRadius: 10,
              paddingLeft: 14,
              paddingRight: 14,
              paddingTop: 6,
              paddingBottom: 6,
              transform: "rotate(18deg)",
            }}
          >
            <span style={{ color: "#f87171", fontWeight: 900, fontSize: 24, letterSpacing: 2 }}>
              PASS
            </span>
          </div>
        </motion.div>

        {/* Bottom metadata */}
        <div className="absolute bottom-0 left-0 right-0 p-5 flex flex-col gap-1.5 pointer-events-none">
          {/* Vibe badge */}
          <div className="flex mb-1">
            <div className="bg-primary rounded-full px-3 py-1">
              <span className="text-xs font-black text-on-primary">{vibePercent}% VIBE</span>
            </div>
          </div>

          {/* Name */}
          <p className="text-[26px] font-extrabold text-white leading-tight truncate">
            {user.displayName ?? user.username}
          </p>

          {/* Username */}
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 600 }}>
            @{user.username}
          </p>

          {/* Explanation */}
          {!!user.explanation && (
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 500 }}>
              {user.explanation}
            </p>
          )}

          {/* Matched artists */}
          {user.matchedArtists?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {user.matchedArtists.slice(0, 3).map((artist) => (
                <div key={artist.id} className="bg-primary/70 px-3 py-1 rounded-full">
                  <span className="text-xs font-bold text-white">{artist.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Matched genres */}
          {user.matchedGenres?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {user.matchedGenres.slice(0, 3).map((genre) => (
                <div
                  key={genre.id}
                  style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
                  className="px-3 py-1 rounded-full"
                >
                  <span className="text-xs font-bold text-white">{genre.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Social context */}
          {(user.mutualFollowCount > 0 || user.sharedCommunityCount > 0 || user.sameCountry) && (
            <div className="flex items-center gap-3 mt-1">
              {user.mutualFollowCount > 0 && (
                <div className="flex items-center gap-1">
                  <Users size={13} color="rgba(255,255,255,0.65)" />
                  <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
                    {user.mutualFollowCount} mutual
                  </span>
                </div>
              )}
              {user.sharedCommunityCount > 0 && (
                <div className="flex items-center gap-1">
                  <Globe size={13} color="rgba(255,255,255,0.65)" />
                  <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
                    {user.sharedCommunityCount} shared
                  </span>
                </div>
              )}
              {user.sameCountry && (
                <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>🌍 Same country</span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  }
);

UserRecommendationCard.displayName = "UserRecommendationCard";
export default UserRecommendationCard;
