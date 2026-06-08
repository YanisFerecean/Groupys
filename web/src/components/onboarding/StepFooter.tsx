"use client";

interface StepFooterProps {
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  loading?: boolean;
  onSkip?: () => void;
}

export default function StepFooter({
  onBack,
  onContinue,
  continueLabel = "Continue",
  continueDisabled,
  loading,
  onSkip,
}: StepFooterProps) {
  return (
    <>
      <div className="h-px bg-outline-variant/30 mt-6 mb-4" />
      <div className="flex items-center justify-between">
        {onBack ? (
          <button
            onClick={onBack}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-on-surface-variant text-sm font-semibold hover:bg-surface-container-high transition-all disabled:opacity-40"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
            Back
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          {onSkip && (
            <button
              onClick={onSkip}
              disabled={loading}
              className="px-4 py-2 rounded-full text-on-surface-variant text-sm font-semibold hover:bg-surface-container-high transition-all disabled:opacity-40"
            >
              Skip
            </button>
          )}
          {onContinue && (
            <button
              onClick={onContinue}
              disabled={continueDisabled || loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-full font-bold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <>
                  {continueLabel}
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
