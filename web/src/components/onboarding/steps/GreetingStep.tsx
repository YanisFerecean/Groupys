"use client";

interface GreetingStepProps {
  name: string;
  onDone: () => void;
}

export default function GreetingStep({ name, onDone }: GreetingStepProps) {
  const firstName = name.trim().split(/\s+/)[0] || "there";
  return (
    <div className="text-center space-y-6 py-4">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-3xl">waving_hand</span>
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">
          Nice to meet you, {firstName}
        </h2>
        <p className="text-on-surface-variant text-sm max-w-sm mx-auto">
          Let&apos;s build out your taste so we can connect you with the right people and communities.
        </p>
      </div>
      <button
        onClick={onDone}
        className="w-full py-3 bg-primary text-on-primary rounded-2xl font-bold text-sm hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98] transition-all"
      >
        Continue
      </button>
    </div>
  );
}
