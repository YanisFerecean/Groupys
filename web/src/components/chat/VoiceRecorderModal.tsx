"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, Send, Square, Trash2, X } from "lucide-react";
import { Waveform, compactPeaks } from "./Waveform";
import { audioPlayer } from "@/lib/audioPlayer";
import { VOICE_BEDS, VOICE_BED_VOLUME, type VoiceBedOption } from "@/lib/voiceBeds";
import type { VoiceBedPayload } from "@/types/chat";

const MAX_MS = 60_000;
const SAMPLE_MS = 120;

interface VoiceRecorderModalProps {
  onClose: () => void;
  onSend: (blob: Blob, durationMs: number, peaks: number[], bed?: VoiceBedPayload) => void;
}

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Records a voice note (mic + live waveform), optionally over a bundled beat that plays
 * softly in the recorder's headphones while recording (never mixed into the upload — the
 * recipient's client mixes the same loop locally), then lets the user review and send it.
 */
export function VoiceRecorderModal({ onClose, onSend }: VoiceRecorderModalProps) {
  const [phase, setPhase] = useState<"idle" | "recording" | "recorded" | "error">("idle");
  const [error, setError] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [reviewPlaying, setReviewPlaying] = useState(false);
  const [bed, setBed] = useState<VoiceBedOption | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const sampleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const blobRef = useRef<Blob | null>(null);
  const bedAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopBed = useCallback(() => {
    if (bedAudioRef.current) {
      bedAudioRef.current.pause();
      bedAudioRef.current = null;
    }
  }, []);

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
    stopBed();
  }, [stopBed]);

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    teardownCapture();
  }, [teardownCapture]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPeaks([]);
      setElapsedMs(0);
      chunksRef.current = [];
      blobRef.current = null;

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
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
      setPhase("recording");

      if (bed) {
        const audio = new Audio(bed.src);
        audio.loop = true;
        audio.volume = VOICE_BED_VOLUME;
        bedAudioRef.current = audio;
        audio.play().catch(() => {});
      }

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
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
      setError("Microphone access was denied.");
      setPhase("error");
    }
  }, [bed, stopRecording]);

  // Start capture on mount (the bed can be switched before recording starts).
  useEffect(() => {
    void startRecording();
    return () => {
      teardownCapture();
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Changing the bed while recording swaps the monitor loop; the chosen bed is sent with the note.
  useEffect(() => {
    if (phase !== "recording") return;
    stopBed();
    if (!bed) return;
    const audio = new Audio(bed.src);
    audio.loop = true;
    audio.volume = VOICE_BED_VOLUME;
    audio.currentTime = ((Date.now() - startRef.current) / 1000) % 30;
    bedAudioRef.current = audio;
    audio.play().catch(() => {});
  }, [bed, phase, stopBed]);

  const durationMs = Math.min(MAX_MS, Math.max(1, elapsedMs));

  // Review playback runs through the shared single-instance audio player (no React
  // ref to mutate), so it interops cleanly with music previews / voice messages.
  const toggleReview = () => {
    const blob = blobRef.current;
    if (!blob) return;
    if (reviewPlaying) {
      audioPlayer.stop();
      stopBed();
      return;
    }
    const url = URL.createObjectURL(blob);
    const audio = audioPlayer.play(url, () => {
      setReviewPlaying(false);
      stopBed();
      URL.revokeObjectURL(url);
    });
    audio
      .play()
      .then(() => {
        setReviewPlaying(true);
        if (bed) {
          const b = new Audio(bed.src);
          b.loop = true;
          b.volume = VOICE_BED_VOLUME;
          bedAudioRef.current = b;
          b.play().catch(() => {});
        }
      })
      .catch(() => setReviewPlaying(false));
  };

  const closeModal = () => {
    audioPlayer.stop();
    stopBed();
    onClose();
  };

  const handleSend = () => {
    if (!blobRef.current) return;
    audioPlayer.stop();
    stopBed();
    onSend(
      blobRef.current,
      durationMs,
      compactPeaks(peaks, 64),
      bed ? { id: bed.id, title: bed.title, kind: bed.kind } : undefined
    );
    onClose();
  };

  const recordAgain = () => {
    audioPlayer.stop();
    stopBed();
    setReviewPlaying(false);
    void startRecording();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeModal}>
      <div
        className="w-full max-w-md rounded-3xl bg-surface border border-surface-container-high shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-on-surface">
            {phase === "recorded"
              ? "Review voice note"
              : phase === "error"
              ? "Voice note"
              : bed
              ? `Voice over ${bed.title}`
              : "Recording…"}
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

            {/* Backing beat picker (bundled, royalty-free; validated server-side). */}
            {phase !== "recorded" && (
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant mb-2">
                  Backing beat
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setBed(null)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                      !bed ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    None
                  </button>
                  {VOICE_BEDS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBed(b)}
                      title={b.description}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                        bed?.id === b.id
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {b.title}
                    </button>
                  ))}
                </div>
                {bed && (
                  <p className="text-[11px] text-on-surface-variant mt-2">
                    The beat plays softly while you record and is mixed in for the listener.
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 mt-6">
              {phase === "recording" ? (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-error text-on-error font-semibold hover:opacity-90"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </button>
              ) : phase === "recorded" ? (
                <>
                  <button
                    onClick={recordAgain}
                    className="h-11 w-11 rounded-full flex items-center justify-center bg-surface-container-high text-on-surface-variant hover:text-error"
                    title="Discard and record again"
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
              ) : null}
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
