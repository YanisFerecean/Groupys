import { Music } from "lucide-react";

/** Square artwork tile with a music-note fallback, shared across music cards. */
export function MusicCardArtwork({
  url,
  alt,
  size = 56,
  rounded = "rounded-lg",
  children,
}: {
  url?: string | null;
  alt: string;
  size?: number;
  rounded?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-surface-container flex items-center justify-center shrink-0 ${rounded}`}
      style={{ width: size, height: size }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <Music className="w-1/2 h-1/2 text-on-surface-variant" />
      )}
      {children}
    </div>
  );
}
