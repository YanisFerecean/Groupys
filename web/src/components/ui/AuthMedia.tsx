"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

function useStopWhenHidden(ref: React.RefObject<HTMLVideoElement | HTMLAudioElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) el.pause();
      },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}

export default function AuthMedia({
  src,
  type,
  className,
}: {
  src: string;
  type: "image" | "video" | "audio";
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useStopWhenHidden(videoRef);
  useStopWhenHidden(audioRef);

  if (type === "video") {
    return (
      <video
        ref={videoRef}
        src={src}
        controls
        preload="metadata"
        className={className}
      />
    );
  }

  if (type === "audio") {
    return (
      <div className={`flex items-center gap-3 bg-surface-container-high rounded-xl px-4 py-3${className ? ` ${className}` : ""}`}>
        <span
          className="material-symbols-outlined text-primary"
          style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}
        >
          music_note
        </span>
        <audio ref={audioRef} src={src} controls className="flex-1 h-8" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt="Post media"
      width={0}
      height={0}
      sizes="100vw"
      className={className}
    />
  );
}
