"use client";

import { useState, useRef, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// ── Color conversion helpers ────────────────────────────────────────────────

function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  };
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(f(5))}${toHex(f(3))}${toHex(f(1))}`;
}

function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

function hueToHex(h: number): string {
  return hsvToHex(h, 1, 1);
}

// ── Preset swatches ─────────────────────────────────────────────────────────

const PRESETS = [
  "#ba002b", "#e53935", "#ff5722", "#ff9800",
  "#ffc107", "#4caf50", "#009688", "#00bcd4",
  "#2196f3", "#3f51b5", "#9c27b0", "#e91e63",
  "#795548", "#607d8b", "#212121", "#f5f5f5",
];

// ── Component ───────────────────────────────────────────────────────────────

interface ColorPickerFieldProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

export default function ColorPickerField({
  label,
  value,
  onChange,
}: ColorPickerFieldProps) {
  const safeValue = isValidHex(value) ? value : "#ba002b";
  const [hsv, setHsv] = useState<[number, number, number]>(() =>
    hexToHsv(safeValue),
  );
  const [hexInput, setHexInput] = useState(safeValue);
  const areaRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [prevValue, setPrevValue] = useState(safeValue);

  // Sync from external value changes (only when value differs from internal state)
  if (isValidHex(value) && value !== prevValue) {
    const newHsv = hexToHsv(value);
    setHsv(newHsv);
    setHexInput(value);
    setPrevValue(value);
  }

  const emitColor = useCallback(
    (h: number, s: number, v: number) => {
      const hex = hsvToHex(h, s, v);
      setHsv([h, s, v]);
      setHexInput(hex);
      setPrevValue(hex);
      onChange(hex);
    },
    [onChange],
  );

  // ── Saturation/Brightness area interaction ──────────────────────────────

  const pickFromArea = useCallback(
    (clientX: number, clientY: number) => {
      const rect = areaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const s = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const v = Math.max(
        0,
        Math.min(1, 1 - (clientY - rect.top) / rect.height),
      );
      emitColor(hsv[0], s, v);
    },
    [hsv, emitColor],
  );

  const handleAreaPointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pickFromArea(e.clientX, e.clientY);
  };

  const handleAreaPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    pickFromArea(e.clientX, e.clientY);
  };

  const handleAreaPointerUp = () => {
    isDragging.current = false;
  };

  // ── Hue slider ──────────────────────────────────────────────────────────

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const h = Number(e.target.value);
    emitColor(h, hsv[1], hsv[2]);
  };

  // ── Hex input ───────────────────────────────────────────────────────────

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!val.startsWith("#")) val = "#" + val;
    setHexInput(val);
    if (isValidHex(val)) {
      const [h, s, v] = hexToHsv(val);
      setHsv([h, s, v]);
      setPrevValue(val);
      onChange(val);
    }
  };

  // ── Preset click ────────────────────────────────────────────────────────

  const handlePreset = (color: string) => {
    const [h, s, v] = hexToHsv(color);
    emitColor(h, s, v);
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>

      {/* Saturation / Brightness area */}
      <div
        ref={areaRef}
        className="relative w-full h-36 rounded-lg cursor-crosshair touch-none select-none"
        style={{
          background: `
            linear-gradient(to top, #000, transparent),
            linear-gradient(to right, #fff, ${hueToHex(hsv[0])})
          `,
        }}
        onPointerDown={handleAreaPointerDown}
        onPointerMove={handleAreaPointerMove}
        onPointerUp={handleAreaPointerUp}
      >
        {/* Thumb */}
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: `${hsv[1] * 100}%`,
            top: `${(1 - hsv[2]) * 100}%`,
            backgroundColor: hsvToHex(hsv[0], hsv[1], hsv[2]),
            boxShadow: "0 0 0 1px rgba(0,0,0,.3), 0 2px 4px rgba(0,0,0,.3)",
          }}
        />
      </div>

      {/* Hue slider */}
      <input
        type="range"
        min={0}
        max={360}
        value={hsv[0]}
        onChange={handleHueChange}
        className="w-full h-3 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gray-300 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-gray-300"
        style={{
          background:
            "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}
      />

      {/* Hex input + current color preview */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg border border-surface-container shrink-0"
          style={{ backgroundColor: isValidHex(hexInput) ? hexInput : safeValue }}
        />
        <Input
          value={hexInput}
          onChange={handleHexChange}
          placeholder="#ba002b"
          className="flex-1 font-mono text-sm"
          maxLength={7}
        />
      </div>

      {/* Preset swatches */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
        {PRESETS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => handlePreset(color)}
            className="aspect-square rounded-lg border-2 transition-transform hover:scale-110"
            style={{
              backgroundColor: color,
              borderColor:
                value === color ? "var(--color-on-surface)" : "transparent",
            }}
          />
        ))}
      </div>
    </div>
  );
}
