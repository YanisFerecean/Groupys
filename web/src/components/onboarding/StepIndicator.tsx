interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {([1, 2, 3] as const).map((step) => (
        <div
          key={step}
          className={`rounded-full transition-all duration-300 ${
            step === currentStep
              ? "w-6 h-2 bg-primary"
              : step < currentStep
                ? "w-2 h-2 bg-primary/40"
                : "w-2 h-2 bg-on-surface/20"
          }`}
        />
      ))}
    </div>
  );
}
