"use client";

import { useState } from "react";

type Variant = "light" | "dark";

export default function WaitlistForm({ variant = "light" }: { variant?: Variant }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      setStatus("success");
      setEmail("");
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error ?? "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  const isDark = variant === "dark";

  if (status === "success") {
    return (
      <p className={`font-semibold text-lg ${isDark ? "text-white" : "text-primary"}`}>
        You&apos;re on the list! We&apos;ll be in touch.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
      <input
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={status === "loading"}
        className={`flex-1 px-5 py-3 rounded-full text-base outline-none transition-all
          ${isDark
            ? "bg-white/15 text-white placeholder:text-white/50 border border-white/20 focus:border-white/60"
            : "bg-surface-container-high text-on-surface placeholder:text-on-surface-variant border border-outline-variant focus:border-primary"
          }`}
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className={`px-6 py-3 rounded-full font-bold transition-all disabled:opacity-60
          ${isDark
            ? "bg-white text-primary hover:scale-105"
            : "bg-primary text-on-primary hover:shadow-lg hover:shadow-primary/20"
          }`}
      >
        {status === "loading" ? "Joining…" : "Join Waitlist"}
      </button>
      {status === "error" && (
        <p className={`text-sm mt-1 sm:col-span-2 ${isDark ? "text-white/70" : "text-red-500"}`}>
          {errorMsg}
        </p>
      )}
    </form>
  );
}
