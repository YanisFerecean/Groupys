"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const PRESET_GRADIENTS = [
  "linear-gradient(135deg, #1a1c1d 0%, #2f3132 40%, #5d3f3f 100%)",
  "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
  "linear-gradient(135deg, #232526 0%, #414345 100%)",
  "linear-gradient(135deg, #200122 0%, #6f0000 100%)",
  "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
  "linear-gradient(135deg, #141e30 0%, #243b55 100%)",
];

interface BannerPickerProps {
  value: string;
  onChange: (url: string) => void;
}

export default function BannerPicker({ value, onChange }: BannerPickerProps) {
  return (
    <div className="space-y-2">
      <Label>Banner Image</Label>
      <Input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste an image URL..."
      />
      <p className="text-xs text-on-surface-variant">Or choose a preset:</p>
      <div className="grid grid-cols-3 gap-2">
        {PRESET_GRADIENTS.map((gradient, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(gradient)}
            className="h-12 rounded-lg border-2 transition-transform hover:scale-105"
            style={{
              backgroundImage: gradient,
              borderColor:
                value === gradient
                  ? "var(--color-on-surface)"
                  : "transparent",
            }}
          />
        ))}
      </div>
    </div>
  );
}
