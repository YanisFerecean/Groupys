"use client";

interface WelcomeStepProps {
  onStart: () => void;
}

export default function WelcomeStep({ onStart }: WelcomeStepProps) {
  return (
    <div className="text-center space-y-6 py-4">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-3xl">graphic_eq</span>
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">
          Welcome to Groupys
        </h1>
        <p className="text-on-surface-variant text-sm max-w-sm mx-auto">
          Let&apos;s set up your profile and tune Groupys to your taste. It only takes a minute.
        </p>
      </div>
      <button
        onClick={onStart}
        className="w-full py-3 bg-primary text-on-primary rounded-2xl font-bold text-sm hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98] transition-all"
      >
        Get started
      </button>
    </div>
  );
}
