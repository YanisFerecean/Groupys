"use client";

import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import BannerCropDialog from "./BannerCropDialog";

const DEFAULT_BANNER =
  "linear-gradient(135deg, #1a1c1d 0%, #2f3132 40%, #5d3f3f 100%)";

const MAX_BANNER_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_BANNER_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const ALLOWED_BANNER_EXTENSIONS = ".jpg, .jpeg, .png, .webp";

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
  const [error, setError] = useState<string | null>(null);
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ALLOWED_BANNER_TYPES.includes(file.type as typeof ALLOWED_BANNER_TYPES[number])) {
      setError("Unsupported format. Use JPG, PNG, or WebP.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_BANNER_SIZE) {
      setError("File too large. Maximum size is 5 MB.");
      e.target.value = "";
      return;
    }

    setCropSourceFile(file);
    e.target.value = "";
  };

  const handleCropConfirm = (cropped: File) => {
    setCropSourceFile(null);
    onFileSelect(cropped);
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
            accept={ALLOWED_BANNER_EXTENSIONS}
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

      {error && (
        <p className="text-xs text-error font-medium">{error}</p>
      )}

      {preview && !error && (
        <p className="text-xs text-on-surface-variant">
          New banner selected — will be uploaded when you save.
        </p>
      )}

      <p className="text-xs text-on-surface-variant/50">
        JPG, PNG, or WebP. Max 5 MB.
      </p>

      {cropSourceFile && (
        <BannerCropDialog
          file={cropSourceFile}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSourceFile(null)}
        />
      )}
    </div>
  );
}
