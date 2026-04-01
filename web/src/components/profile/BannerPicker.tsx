"use client";

import { useRef } from "react";
import { Label } from "@/components/ui/label";
import { resizeImage } from "@/lib/imageResize";

const DEFAULT_BANNER =
  "linear-gradient(135deg, #1a1c1d 0%, #2f3132 40%, #5d3f3f 100%)";

interface BannerPickerProps {
  /** Current stored banner URL or gradient string */
  value: string;
  /** Base64 data-URL preview of a newly selected file */
  preview: string | null;
  onFileSelect: (file: File) => void;
  onClear: () => void;
}

export default function BannerPicker({
  value,
  preview,
  onFileSelect,
  onClear,
}: BannerPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  let bgStyle: React.CSSProperties;
  if (preview) {
    bgStyle = { backgroundImage: `url(${preview})` };
  } else if (!value) {
    bgStyle = { backgroundImage: DEFAULT_BANNER };
  } else if (
    value.startsWith("linear-gradient") ||
    value.startsWith("radial-gradient")
  ) {
    bgStyle = { backgroundImage: value };
  } else {
    bgStyle = { backgroundImage: `url(${value})` };
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const resized = await resizeImage(file, 1500, 500, true);
    onFileSelect(resized);
    e.target.value = "";
  };

  const showClear = !!preview || !!value;

  return (
    <div className="space-y-2">
      <Label>Banner Image</Label>

      <div className="relative h-28 w-full rounded-xl overflow-hidden bg-cover bg-center">
        <div className="absolute inset-0" style={bgStyle} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        <div className="absolute inset-0 flex items-center justify-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-semibold hover:bg-black/60 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              add_photo_alternate
            </span>
            {preview || value ? "Change" : "Upload Image"}
          </button>

          {showClear && (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-semibold hover:bg-black/60 transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                close
              </span>
              Remove
            </button>
          )}
        </div>
      </div>

      {preview && (
        <p className="text-xs text-on-surface-variant">
          New banner selected — will be uploaded when you save.
        </p>
      )}
    </div>
  );
}
