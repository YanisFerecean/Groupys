const STEPS = ["Genres", "Artists", "Communities"] as const;

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-start justify-center gap-0">
      {STEPS.map((label, idx) => {
        const stepNum = (idx + 1) as 1 | 2 | 3;
        const isCompleted = stepNum < currentStep;
        const isActive = stepNum === currentStep;

        return (
          <div key={label} className="flex items-start">
            {/* Step node */}
            <div className="flex flex-col items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold transition-all duration-300 ${
                  isCompleted
                    ? "bg-primary text-on-primary"
                    : isActive
                    ? "bg-primary text-on-primary shadow-lg shadow-primary/30"
                    : "bg-surface-container-high text-on-surface-variant/40"
                }`}
              >
                {isCompleted ? (
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}
                  >
                    check
                  </span>
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${
                  isActive
                    ? "text-primary"
                    : isCompleted
                    ? "text-on-surface-variant/60"
                    : "text-on-surface-variant/25"
                }`}
              >
                {label}
              </span>
            </div>

            {/* Connecting line */}
            {idx < STEPS.length - 1 && (
              <div className="flex items-center mt-4 mx-3">
                <div
                  className={`w-16 h-px rounded-full transition-all duration-500 ${
                    stepNum < currentStep ? "bg-primary/50" : "bg-outline-variant/40"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
