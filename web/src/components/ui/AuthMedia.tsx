export default function AuthMedia({
  src,
  type,
  className,
}: {
  src: string;
  type: "image" | "video" | "audio";
  className?: string;
}) {
  if (type === "video") {
    return (
      <video
        src={src}
        controls
        preload="none"
        className={className}
      />
    );
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
        <audio src={src} controls className="flex-1 h-8" />
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt="Post media"
      loading="lazy"
      className={className}
    />
  );
}
