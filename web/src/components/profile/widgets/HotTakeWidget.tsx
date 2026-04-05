"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import {
  fetchCurrentHotTake,
  fetchUserHotTakeAnswer,
  type HotTakeAnswerRes,
  type HotTakeRes,
} from "@/lib/hot-take-api";
import { getContrastColor } from "@/lib/utils";
import WidgetCard from "./WidgetCard";

interface HotTakeWidgetProps {
  username: string;
  containerColor?: string;
  size?: "small" | "normal";
}

export default function HotTakeWidget({ username, containerColor, size = "normal" }: HotTakeWidgetProps) {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  const [hotTake, setHotTake] = useState<HotTakeRes | null>(null);
  const [answer, setAnswer] = useState<HotTakeAnswerRes | null>(null);
  const [loading, setLoading] = useState(true);

  const textColor = containerColor ? getContrastColor(containerColor) : undefined;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getTokenRef.current();
        const [ht, ans] = await Promise.all([
          fetchCurrentHotTake(),
          fetchUserHotTakeAnswer(username, token),
        ]);
        if (!cancelled) {
          setHotTake(ht);
          setAnswer(ans);
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [username]);

  if (!loading && (!hotTake || !answer)) return null;

  const title = hotTake?.weekLabel
    ? `Hot Take · ${hotTake.weekLabel}`
    : "Hot Take";

  const picks = answer?.answers ?? [];
  const multiPick = picks.length > 1;

  return (
    <WidgetCard
      title={title}
      className="overflow-hidden"
      style={containerColor ? { backgroundColor: containerColor } : undefined}
      textColor={textColor}
    >
      {loading ? (
        <div className="h-16 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-outline border-t-primary animate-spin" />
        </div>
      ) : size === "small" ? (
        /* ── Small: first pick image + answer text ── */
        <div className="flex flex-col items-center gap-3 w-full">
          {answer!.imageUrls[0] ? (
            <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-md">
              <Image
                src={answer!.imageUrls[0]!}
                alt={picks[0]}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-full aspect-square rounded-xl bg-surface-container-high flex items-center justify-center">
              <span
                className="material-symbols-outlined text-on-surface-variant/40"
                style={{ fontSize: 48, fontVariationSettings: "'FILL' 1" }}
              >
                local_fire_department
              </span>
            </div>
          )}
          <p
            className="text-xs font-bold truncate w-full text-center"
            style={{ color: textColor ?? "inherit" }}
          >
            {picks[0]}{multiPick ? ` +${picks.length - 1}` : ""}
          </p>
        </div>
      ) : (
        /* ── Normal: question + all picks ── */
        <div className="space-y-3">
          <p
            className="text-xs font-semibold leading-snug line-clamp-2"
            style={textColor ? { color: textColor, opacity: 0.7 } : { color: "var(--color-on-surface-variant)" }}
          >
            {hotTake!.question}
          </p>
          <div className="space-y-2">
            {picks.map((pick, i) => (
              <div key={i} className="flex items-center gap-3">
                {answer!.imageUrls[i] ? (
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 shadow-md">
                    <Image
                      src={answer!.imageUrls[i]!}
                      alt={pick}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0">
                    <span
                      className="material-symbols-outlined text-on-surface-variant/40"
                      style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
                    >
                      {answer!.musicTypes[i] === "track" ? "music_note" : answer!.musicTypes[i] === "album" ? "album" : "person"}
                    </span>
                  </div>
                )}
                <p
                  className="font-bold text-sm leading-snug line-clamp-1"
                  style={{ color: textColor ?? "inherit" }}
                >
                  {pick}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
