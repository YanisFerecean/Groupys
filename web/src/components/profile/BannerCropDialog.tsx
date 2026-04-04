"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface BannerCropDialogProps {
  file: File;
  onConfirm: (file: File) => void;
  onCancel: () => void;
  onCropChange?: (pos: { x: number; y: number }) => void;
}

const BANNER_W = 1500;
const BANNER_H = 500;
const BANNER_RATIO = BANNER_W / BANNER_H; // 3:1

export default function BannerCropDialog({
  file,
  onConfirm,
  onCancel,
  onCropChange,
}: BannerCropDialogProps) {
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const [cropPos, setCropPos] = useState({ x: 0.5, y: 0.5 }); // 0-1
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, cx: 0, cy: 0 });
  const dimsRef = useRef<{ w: number; h: number } | null>(null);

  const objectUrl = useMemo(() => URL.createObjectURL(file), [file]);

  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
      setImgDims({ w, h });
      dimsRef.current = { w, h };

      // Default crop: center, but biased top if very tall
      const imgRatio = w / h;
      const initialPos = {
        x: 0.5,
        y: imgRatio < BANNER_RATIO ? 0.4 : 0.5,
      };
      setCropPos(initialPos);
      onCropChange?.(initialPos);
    },
    [onCropChange],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY, cx: cropPos.x, cy: cropPos.y };
    },
    [cropPos],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !containerRef.current || !dimsRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dims = dimsRef.current;
    const imgRatio = dims.w / dims.h;
    const contRatio = rect.width / rect.height;

    // How much of the source image is visible (fraction)
    let visXFrac: number, visYFrac: number;
    if (imgRatio > contRatio) {
      visXFrac = contRatio / imgRatio;
      visYFrac = 1;
    } else {
      visXFrac = 1;
      visYFrac = imgRatio / contRatio;
    }

    const dx = (e.clientX - dragStart.current.x) / rect.width;
    const dy = (e.clientY - dragStart.current.y) / rect.height;

    const newX = Math.max(0, Math.min(1, dragStart.current.cx + dx / (1 - visXFrac)));
    const newY = Math.max(0, Math.min(1, dragStart.current.cy + dy / (1 - visYFrac)));
    const newPos = { x: newX, y: newY };
    setCropPos(newPos);
    onCropChange?.(newPos);
  }, [onCropChange]);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleConfirm = useCallback(() => {
    if (!imgDims || !dimsRef.current) return;
    const dims = dimsRef.current;
    const imgRatio = dims.w / dims.h;

    // Viewport size in source-image pixels
    let vw: number, vh: number;
    if (imgRatio > BANNER_RATIO) {
      vh = dims.h;
      vw = vh * BANNER_RATIO;
    } else {
      vw = dims.w;
      vh = vw / BANNER_RATIO;
    }

    const sx = Math.round(cropPos.x * (dims.w - vw));
    const sy = Math.round(cropPos.y * (dims.h - vh));

    const canvas = document.createElement("canvas");
    canvas.width = BANNER_W;
    canvas.height = BANNER_H;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, sx, sy, vw, vh, 0, 0, BANNER_W, BANNER_H);
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          onConfirm(new File([blob], file.name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.88,
      );
    };
    img.src = objectUrl!;
  }, [imgDims, cropPos, objectUrl, file.name, onConfirm]);

  // CSS object-position from crop 0-1 → 0%-100%
  const objPos = imgDims
    ? `${cropPos.x * 100}% ${cropPos.y * 100}%`
    : "50% 50%";

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <DialogTitle className="text-lg font-bold text-on-surface p-0">
            Position your banner
          </DialogTitle>
        </div>

        <p className="px-6 pb-4 text-sm text-on-surface-variant">
          Drag the image to choose which section is visible.
        </p>

        {/* Crop area */}
        <div className="px-6">
          <div
            ref={containerRef}
            className="relative w-full overflow-hidden rounded-xl bg-surface-container-highest cursor-grab active:cursor-grabbing select-none"
            style={{ aspectRatio: `${BANNER_RATIO} / 1` }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {objectUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={objectUrl}
                alt="Banner preview"
                onLoad={handleImageLoad}
                draggable={false}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{
                  objectFit: "cover",
                  objectPosition: objPos,
                }}
              />
            )}

            {/* Darken outside viewport */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-x-0 top-0 h-[12%] bg-black/30" />
              <div className="absolute inset-x-0 bottom-0 h-[12%] bg-black/30" />
              <div className="absolute inset-y-0 left-0 w-[8%] bg-black/30" />
              <div className="absolute inset-y-0 right-0 w-[8%] bg-black/30" />
            </div>

            {/* Viewport border */}
            <div className="absolute inset-[12%] rounded-md border-2 border-white/60 pointer-events-none shadow-[0_0_0_4000px_rgba(0,0,0,0.25)]" />

            {/* Corner handles */}
            <div className="absolute inset-[12%] pointer-events-none">
              <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white rounded-tl" />
              <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white rounded-tr" />
              <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white rounded-bl" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white rounded-br" />
            </div>

            {/* Drag hint */}
            {imgDims && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs font-medium">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>drag_pan</span>
                  Drag to reposition
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dimensions info */}
        {imgDims && (
          <p className="px-6 pt-3 text-xs text-on-surface-variant/50">
            {imgDims.w} × {imgDims.h}px — will be cropped to {BANNER_W} × {BANNER_H}px
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-5">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-full text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!imgDims}
            className="px-6 py-2.5 rounded-full text-sm font-bold bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            Apply
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
