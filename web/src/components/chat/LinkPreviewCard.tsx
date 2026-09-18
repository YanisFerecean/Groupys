"use client";

import { Link2 } from "lucide-react";
import { LinkPreviewPayload } from "@/types/chat";
import { safeHttpUrl } from "@/lib/mediaUrl";

interface LinkPreviewCardProps {
  payload: LinkPreviewPayload;
  isMine: boolean;
}

/** OpenGraph link card (server-resolved metadata for a pasted public URL). */
export function LinkPreviewCard({ payload, isMine }: LinkPreviewCardProps) {
  const href = safeHttpUrl(payload.url);
  const image = safeHttpUrl(payload.imageUrl);
  let host = payload.siteName;
  if (!host && href) {
    try {
      host = new URL(href).hostname.replace(/^www\./, "");
    } catch {
      host = undefined;
    }
  }

  const body = (
    <>
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          className="w-full h-[150px] object-cover block"
        />
      )}
      <div className="px-4 py-3 space-y-0.5">
        {host && (
          <p
            className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide truncate ${
              isMine ? "text-on-primary/70" : "text-on-surface-variant"
            }`}
          >
            <Link2 className="w-3 h-3 shrink-0" />
            {host}
          </p>
        )}
        <p className={`text-[15px] font-bold leading-snug line-clamp-2 ${isMine ? "text-on-primary" : "text-on-surface"}`}>
          {payload.title}
        </p>
        {payload.description && (
          <p className={`text-[13px] leading-snug line-clamp-3 ${isMine ? "text-on-primary/80" : "text-on-surface-variant"}`}>
            {payload.description}
          </p>
        )}
      </div>
    </>
  );

  const className = `block w-[300px] max-w-full overflow-hidden rounded-3xl border transition-opacity hover:opacity-90 ${
    isMine
      ? "bg-primary border-primary rounded-br-sm"
      : "bg-surface-container-high border-surface-container-highest rounded-bl-sm shadow-sm"
  }`;

  if (!href) {
    return <div className={className}>{body}</div>;
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className={className}>
      {body}
    </a>
  );
}
