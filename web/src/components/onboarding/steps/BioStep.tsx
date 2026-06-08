"use client";

import StepFooter from "../StepFooter";

interface BioStepProps {
  value: string;
  onChange: (bio: string) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}

export default function BioStep({ value, onChange, onBack, onContinue, onSkip }: BioStepProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">
          Add a short bio
        </h2>
        <p className="text-on-surface-variant text-sm">
          A line or two about you and your taste. You can change it any time.
        </p>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Crate-digger, festival regular, always chasing the next favourite album…"
        maxLength={300}
        className="w-full min-h-32 resize-none rounded-xl bg-surface-container-lowest border border-outline-variant/40 px-4 py-3 text-sm text-on-surface outline-none focus:border-primary transition-colors"
      />
      <p className="text-right text-xs text-on-surface-variant/60">{value.length}/300</p>

      <StepFooter onBack={onBack} onContinue={onContinue} onSkip={onSkip} />
    </div>
  );
}
