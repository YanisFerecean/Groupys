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

  const title = hotTake?.weekLabel
    ? `Hot Take · ${hotTake.weekLabel}`
    : "Hot Take";

  return (
    <WidgetCard
      title={title}
      className="h-[260px] overflow-hidden"
      style={containerColor ? { backgroundColor: containerColor } : undefined}
      textColor={textColor}
    >
      {loading ? (
        <div className="h-16 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-outline border-t-primary animate-spin" />
        </div>
      ) : !hotTake ? (
        <p
          className="text-sm"
          style={textColor ? { color: textColor, opacity: 0.6 } : { color: "var(--color-on-surface-variant)" }}
        >
          No hot take this week yet.
        </p>
      ) : !answer ? (
        <div className="space-y-3">
          <p
            className="text-xs font-semibold leading-snug"
            style={textColor ? { color: textColor, opacity: 0.7 } : { color: "var(--color-on-surface-variant)" }}
          >
            {hotTake.question}
          </p>
          <p
            className="text-xs"
            style={textColor ? { color: textColor, opacity: 0.5 } : { color: "var(--color-on-surface-variant)" }}
          >
            No answer yet.
          </p>
        </div>
      ) : size === "small" ? (
        /* ── Small: image + answer text only ── */
        <div className="flex flex-col items-center gap-3 w-full">
          {answer.imageUrl ? (
            <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-md">
              <Image
                src={answer.imageUrl}
                alt={answer.answer}
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
            {answer.answer}
          </p>
        </div>
      ) : (
        /* ── Normal: question + answer ── */
        <div className="space-y-4">
          <p
            className="text-xs font-semibold leading-snug line-clamp-2"
            style={textColor ? { color: textColor, opacity: 0.7 } : { color: "var(--color-on-surface-variant)" }}
          >
            {hotTake.question}
          </p>
          <div className="flex items-center gap-3">
            {answer.imageUrl ? (
              <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-md">
                <Image
                  src={answer.imageUrl}
                  alt={answer.answer}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0">
                <span
                  className="material-symbols-outlined text-on-surface-variant/40"
                  style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}
                >
                  {answer.musicType === "track" ? "music_note" : answer.musicType === "album" ? "album" : "person"}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <p
                className="font-bold text-sm leading-snug line-clamp-2"
                style={{ color: textColor ?? "inherit" }}
              >
                {answer.answer}
              </p>
              {answer.musicType && (
                <p
                  className="text-xs capitalize mt-0.5"
                  style={textColor ? { color: textColor, opacity: 0.5 } : { color: "var(--color-on-surface-variant)" }}
                >
                  {answer.musicType}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
