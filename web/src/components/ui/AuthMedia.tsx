"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

export default function AuthMedia({
  src,
  type,
  className,
}: {
  src: string;
  type: "image" | "video" | "audio";
  className?: string;
}) {
  const { getToken } = useAuth();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoke: string | null = null;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(src, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        revoke = url;
        setBlobUrl(url);
      } catch {
        // ignore
      }
    })();
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [src, getToken]);

  if (!blobUrl) {
    const icon = type === "audio" ? "music_note" : "image";
    return (
      <div
        className={`bg-surface-container-high flex items-center justify-center ${type === "audio" ? "h-14 rounded-xl" : ""} ${className}`}
      >
        <span className="material-symbols-outlined text-on-surface-variant/30 text-2xl animate-pulse">
          {icon}
        </span>
      </div>
    );
  }

  if (type === "video") {
    return <video src={blobUrl} controls className={className} />;
  }

  if (type === "audio") {
    return (
      <div className={`flex items-center gap-3 bg-surface-container-high rounded-xl px-4 py-3 ${className}`}>
        <span
          className="material-symbols-outlined text-primary"
          style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}
        >
          music_note
        </span>
        <audio src={blobUrl} controls className="flex-1 h-8" />
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={blobUrl} alt="Post media" className={className} />;
}
