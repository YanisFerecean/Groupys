"use client";

import CountrySelect from "@/components/profile/CountrySelect";
import StepFooter from "../StepFooter";

interface CountryStepProps {
  value: string;
  onChange: (country: string) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}

export default function CountryStep({ value, onChange, onBack, onContinue, onSkip }: CountryStepProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">
          Where are you based?
        </h2>
        <p className="text-on-surface-variant text-sm">
          We use this to surface nearby people and local communities.
        </p>
      </div>

      <CountrySelect value={value} onChange={onChange} />

      <StepFooter onBack={onBack} onContinue={onContinue} onSkip={onSkip} />
    </div>
  );
}
