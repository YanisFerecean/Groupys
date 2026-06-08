"use client";

import { useState } from "react";

interface AccountStepProps {
  initialDisplayName: string;
  initialUsername: string;
  saving: boolean;
  submitError: string | null;
  onBack: () => void;
  onSubmit: (displayName: string, username: string) => void;
}

export default function AccountStep({
  initialDisplayName,
  initialUsername,
  saving,
  submitError,
  onBack,
  onSubmit,
}: AccountStepProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [username, setUsername] = useState(initialUsername);

  const usernameValid = /^[a-zA-Z0-9_]{3,30}$/.test(username);
  const canSubmit = displayName.trim().length > 0 && usernameValid && !saving;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">
          Set up your profile
        </h2>
        <p className="text-on-surface-variant text-sm">
          This is how others will find and recognise you.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">
            Display name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            maxLength={50}
            className="mt-1.5 w-full rounded-xl bg-surface-container-lowest border border-outline-variant/40 px-4 py-3 text-sm text-on-surface outline-none focus:border-primary transition-colors"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">
            Username
          </label>
          <div className="relative mt-1.5">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-sm">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
              placeholder="username"
              maxLength={30}
              className="w-full rounded-xl bg-surface-container-lowest border border-outline-variant/40 pl-8 pr-4 py-3 text-sm text-on-surface outline-none focus:border-primary transition-colors"
            />
          </div>
          {username.length > 0 && !usernameValid && (
            <p className="text-xs text-on-surface-variant mt-1">
              3–30 characters, letters, numbers and underscores only.
            </p>
          )}
        </div>
      </div>

      {submitError && <p className="text-error text-xs">{submitError}</p>}

      <div className="h-px bg-outline-variant/30" />
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-on-surface-variant text-sm font-semibold hover:bg-surface-container-high transition-all disabled:opacity-40"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
          Back
        </button>
        <button
          onClick={() => onSubmit(displayName.trim(), username)}
          disabled={!canSubmit}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-full font-bold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {saving ? "Saving…" : "Continue"}
          {!saving && (
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
          )}
        </button>
      </div>
    </div>
  );
}
