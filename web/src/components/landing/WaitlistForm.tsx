"use client";

import { useState } from "react";

type Variant = "light" | "dark";

const USE_CASE_OPTIONS = ["Communities", "Matching", "Rating Albums", "Hot Takes"];
const PLATFORM_OPTIONS = ["Spotify", "Apple Music", "YouTube Music", "Other"];

export default function WaitlistForm({ variant = "light" }: { variant?: Variant }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [useCases, setUseCases] = useState<string[]>([]);
  const [platform, setPlatform] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const isDark = variant === "dark";

  function toggleUseCase(option: string) {
    setUseCases((prev) =>
      prev.includes(option) ? prev.filter((v) => v !== option) : [...prev, option]
    );
  }

  function handleEmailNext(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setStep(2);
  }

  async function handleSurveySubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, survey: { useCases, platform } }),
    });

    if (res.ok) {
      setStep(3);
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error ?? "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  const inputClass = `flex-1 px-5 py-3 rounded-full text-base outline-none transition-all ${
    isDark
      ? "bg-white/15 text-white placeholder:text-white/50 border border-white/20 focus:border-white/60"
      : "bg-surface-container-high text-on-surface placeholder:text-on-surface-variant border border-outline-variant focus:border-primary"
  }`;

  const btnClass = `px-6 py-3 rounded-full font-bold transition-all disabled:opacity-60 ${
    isDark
      ? "bg-white text-primary hover:scale-105"
      : "bg-primary text-on-primary hover:shadow-lg hover:shadow-primary/20"
  }`;

  const labelClass = `text-sm font-medium ${isDark ? "text-white/80" : "text-on-surface-variant"}`;

  const chipBase = "px-4 py-2 rounded-full text-sm font-medium border transition-all cursor-pointer select-none";
  const chipActive = isDark
    ? "bg-white text-primary border-white"
    : "bg-primary text-on-primary border-primary";
  const chipInactive = isDark
    ? "bg-white/10 text-white/70 border-white/20 hover:bg-white/20"
    : "bg-surface-container text-on-surface-variant border-outline-variant hover:bg-surface-container-high";

  if (step === 3) {
    return (
      <p className={`font-semibold text-lg ${isDark ? "text-white" : "text-primary"}`}>
        You&apos;re on the list! We&apos;ll be in touch.
      </p>
    );
  }

  if (step === 2) {
    return (
      <form onSubmit={handleSurveySubmit} className="w-full max-w-md space-y-5">
        <div className="space-y-2">
          <p className={labelClass}>What will you use Groupys for?</p>
          <div className="flex flex-wrap gap-2">
            {USE_CASE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => toggleUseCase(opt)}
                className={`${chipBase} ${useCases.includes(opt) ? chipActive : chipInactive}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className={labelClass}>What platform do you use?</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setPlatform(opt)}
                className={`${chipBase} ${platform === opt ? chipActive : chipInactive}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          className={`w-full ${btnClass}`}
        >
          {status === "loading" ? "Joining…" : "Join Waitlist"}
        </button>

        {status === "error" && (
          <p className={`text-sm ${isDark ? "text-white/70" : "text-red-500"}`}>{errorMsg}</p>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={handleEmailNext} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
      <input
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputClass}
      />
      <button type="submit" className={btnClass}>
        Continue
      </button>
    </form>
  );
}
