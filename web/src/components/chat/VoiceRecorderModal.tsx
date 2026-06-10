"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, Send, Square, Trash2, X } from "lucide-react";
import { Waveform, compactPeaks } from "./Waveform";
import { audioPlayer } from "@/lib/audioPlayer";

const MAX_MS = 60_000;
const SAMPLE_MS = 120;

interface VoiceRecorderModalProps {
  onClose: () => void;
  onSend: (blob: Blob, durationMs: number, peaks: number[]) => void;
}

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Records a voice note (mic + live waveform), then lets the user review and send it. */
export function VoiceRecorderModal({ onClose, onSend }: VoiceRecorderModalProps) {
  const [phase, setPhase] = useState<"recording" | "recorded" | "error">("recording");
  const [error, setError] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [reviewPlaying, setReviewPlaying] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const sampleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const blobRef = useRef<Blob | null>(null);

  const teardownCapture = useCallback(() => {
    if (sampleTimerRef.current) clearInterval(sampleTimerRef.current);
    if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    sampleTimerRef.current = null;
    tickTimerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      void audioCtxRef.current.close();
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    teardownCapture();
  }, [teardownCapture]);

  // Start capture on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const recorder = new MediaRecorder(stream);
        recorderRef.current = recorder;
        chunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          blobRef.current = blob;
          setPhase("recorded");
        };
        recorder.start();
        startRef.current = Date.now();

        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);

        sampleTimerRef.current = setInterval(() => {
          analyser.getByteTimeDomainData(buf);
          let peak = 0;
          for (let i = 0; i < buf.length; i++) {
            const dev = Math.abs(buf[i] - 128) / 128;
            if (dev > peak) peak = dev;
          }
          setPeaks((prev) => [...prev, Math.min(1, Math.max(0.03, peak))]);
        }, SAMPLE_MS);

        tickTimerRef.current = setInterval(() => {
          const ms = Date.now() - startRef.current;
          setElapsedMs(ms);
          if (ms >= MAX_MS) stopRecording();
        }, 100);
      } catch {
        if (!cancelled) {
          setError("Microphone access was denied.");
          setPhase("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      teardownCapture();
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
    };
  }, [teardownCapture, stopRecording]);

  const durationMs = Math.min(MAX_MS, Math.max(1, elapsedMs));

  // Review playback runs through the shared single-instance audio player (no React
  // ref to mutate), so it interops cleanly with music previews / voice messages.
  const toggleReview = () => {
    const blob = blobRef.current;
    if (!blob) return;
    if (reviewPlaying) {
      audioPlayer.stop();
      return;
    }
    const url = URL.createObjectURL(blob);
    const audio = audioPlayer.play(url, () => {
      setReviewPlaying(false);
      URL.revokeObjectURL(url);
    });
    audio.play().then(() => setReviewPlaying(true)).catch(() => setReviewPlaying(false));
  };

  const closeModal = () => {
    audioPlayer.stop();
    onClose();
  };

  const handleSend = () => {
    if (!blobRef.current) return;
    audioPlayer.stop();
    onSend(blobRef.current, durationMs, compactPeaks(peaks, 64));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeModal}>
      <div
        className="w-full max-w-md rounded-3xl bg-surface border border-surface-container-high shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-on-surface">
            {phase === "recorded" ? "Review voice note" : phase === "error" ? "Voice note" : "Recording…"}
          </h3>
          <button
            onClick={closeModal}
            className="h-8 w-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {phase === "error" ? (
          <p className="text-sm text-on-surface-variant py-6 text-center">{error}</p>
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-2xl bg-surface-container px-4 py-4 text-primary">
              {phase === "recording" && (
                <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse shrink-0" />
              )}
              <div className="flex-1 min-w-0 text-on-surface">
                <Waveform peaks={peaks.slice(-56)} progress={1} height={32} filledClass="bg-primary" />
              </div>
              <span className="text-[12px] tabular-nums text-on-surface-variant shrink-0">
                {fmt(elapsedMs)}
              </span>
            </div>

            <div className="flex items-center justify-center gap-3 mt-6">
              {phase === "recording" ? (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-error text-on-error font-semibold hover:opacity-90"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </button>
              ) : (
                <>
                  <button
                    onClick={closeModal}
                    className="h-11 w-11 rounded-full flex items-center justify-center bg-surface-container-high text-on-surface-variant hover:text-error"
                    title="Discard"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={toggleReview}
                    className="h-11 w-11 rounded-full flex items-center justify-center bg-surface-container-high text-primary"
                    title={reviewPlaying ? "Pause" : "Play"}
                  >
                    {reviewPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>
                  <button
                    onClick={handleSend}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary font-semibold hover:opacity-90"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </button>
                </>
              )}
            </div>

            {phase === "recording" && (
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-on-surface-variant mt-4">
                <Mic className="w-3 h-3" />
                Up to 60 seconds
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
