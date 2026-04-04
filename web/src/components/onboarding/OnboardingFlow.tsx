"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { ArtistSearchResult } from "@/lib/api";
import { fetchUserByClerkId, updateBackendUser, joinCommunity } from "@/lib/api";
import StepIndicator from "./StepIndicator";
import GenreStep from "./GenreStep";
import ArtistStep from "./ArtistStep";
import CommunityStep from "./CommunityStep";

type OnboardingStep = 1 | 2 | 3;

const SLIDE_DISTANCE = 40;

function slideVariants(direction: 1 | -1) {
  return {
    initial: {
      x: direction * SLIDE_DISTANCE,
      opacity: 0,
    },
    animate: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.28,
        ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
      },
    },
    exit: {
      x: direction * -SLIDE_DISTANCE,
      opacity: 0,
      transition: {
        duration: 0.2,
        ease: "easeIn" as const,
      },
    },
  };
}

export default function OnboardingFlow() {
  const { getToken, isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [step, setStep] = useState<OnboardingStep>(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<ArtistSearchResult[]>([]);
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<Set<string>>(new Set());
  const [step3Token, setStep3Token] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const backendUserIdRef = useRef<string | null>(null);
  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  // Fetch backend user ID on mount
  useEffect(() => {
    if (!isLoaded || !isAuthLoaded || !isSignedIn || !user) return;
    getTokenRef.current().then((token) => {
      fetchUserByClerkId(user.id, token).then((bu) => {
        if (bu) backendUserIdRef.current = bu.id;
      }).catch(() => {/* non-critical */});
    });
  }, [isLoaded, isAuthLoaded, isSignedIn, user]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (isAuthLoaded && !isSignedIn) router.replace("/");
  }, [isAuthLoaded, isSignedIn, router]);

  const canProceed =
    step === 1 ? selectedGenres.length >= 1 :
    step === 2 ? selectedArtists.length >= 1 :
    true;

  const handleToggleGenre = useCallback((genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  }, []);

  const handleToggleArtist = useCallback((artist: ArtistSearchResult) => {
    setSelectedArtists((prev) => {
      const exists = prev.find((a) => a.id === artist.id);
      return exists ? prev.filter((a) => a.id !== artist.id) : [...prev, artist];
    });
  }, []);

  const handleToggleCommunity = useCallback((communityId: string) => {
    setSelectedCommunityIds((prev) => {
      const next = new Set(prev);
      if (next.has(communityId)) next.delete(communityId);
      else next.add(communityId);
      return next;
    });
  }, []);

  const handleNext = useCallback(async () => {
    setDirection(1);
    if (step === 2) {
      // Pre-fetch token so CommunityStep can fire immediately
      const token = await getTokenRef.current();
      setStep3Token(token);
    }
    setStep((s) => (s + 1) as OnboardingStep);
  }, [step]);

  const handleBack = useCallback(() => {
    setDirection(-1);
    setStep((s) => (s - 1) as OnboardingStep);
  }, []);

  const handleComplete = useCallback(async () => {
    if (!user) return;
    setIsCompleting(true);
    setCompletionError(null);

    try {
      const token = await getTokenRef.current();

      const saveArtists = backendUserIdRef.current
        ? updateBackendUser(
            backendUserIdRef.current,
            {
              topArtists: selectedArtists.map((a) => ({
                id: a.id,
                name: a.name,
                genre: a.primaryGenre?.name,
                imageUrl: a.images[0],
              })),
            },
            token,
          )
        : Promise.resolve(null);

      const joinAll = Promise.allSettled(
        [...selectedCommunityIds].map((id) => joinCommunity(id, token)),
      );

      const [artistsResult] = await Promise.allSettled([saveArtists, joinAll]);

      if (artistsResult.status === "rejected") {
        setCompletionError("Couldn't save your artists. Please try again.");
        setIsCompleting(false);
        return;
      }

      localStorage.setItem(`onboarding_done_${user.id}`, "true");
      router.replace("/feed");
    } catch {
      setCompletionError("Something went wrong. Please try again.");
      setIsCompleting(false);
    }
  }, [user, selectedArtists, selectedCommunityIds, router]);

  const handleSkip = useCallback(async () => {
    if (!user) return;
    setIsCompleting(true);

    // Still try to join selected communities even on skip
    try {
      const token = await getTokenRef.current();
      await Promise.allSettled(
        [...selectedCommunityIds].map((id) => joinCommunity(id, token)),
      );
    } catch {/* non-critical */}

    localStorage.setItem(`onboarding_done_${user.id}`, "true");
    router.replace("/feed");
  }, [user, selectedCommunityIds, router]);

  if (!isAuthLoaded || !isSignedIn) return null;

  const variants = slideVariants(direction);

  return (
    <div className="min-h-screen bg-surface relative overflow-hidden flex flex-col items-center justify-center px-4 py-12">
      {/* Gradient blob decorations */}
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8 space-y-4">
          <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">
            Welcome to Groupys
          </p>
          <StepIndicator currentStep={step} />
        </div>

        {/* Step card */}
        <div className="bg-surface-container rounded-3xl p-7 sm:p-10 shadow-xl overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {step === 1 && (
              <motion.div key="step-1" {...variants}>
                <GenreStep selected={selectedGenres} onToggle={handleToggleGenre} />
              </motion.div>
            )}
            {step === 2 && (
              <motion.div key="step-2" {...variants}>
                <ArtistStep selected={selectedArtists} onToggle={handleToggleArtist} selectedGenres={selectedGenres} />
              </motion.div>
            )}
            {step === 3 && (
              <motion.div key="step-3" {...variants}>
                <CommunityStep
                  selectedGenres={selectedGenres}
                  selectedCommunityIds={selectedCommunityIds}
                  onToggle={handleToggleCommunity}
                  token={step3Token}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className="flex items-center justify-between mt-8">
            {step > 1 ? (
              <button
                onClick={handleBack}
                disabled={isCompleting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-on-surface-variant font-semibold text-sm hover:bg-surface-container-high transition-all disabled:opacity-40"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  arrow_back
                </span>
                Back
              </button>
            ) : (
              <div />
            )}

            {step === 3 ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSkip}
                  disabled={isCompleting}
                  className="px-5 py-2.5 rounded-full text-on-surface-variant font-semibold text-sm hover:bg-surface-container-high transition-all disabled:opacity-40"
                >
                  Skip
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isCompleting}
                  className="flex items-center gap-2 px-8 py-2.5 bg-primary text-on-primary rounded-full font-bold text-sm hover:shadow-xl hover:shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {isCompleting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Saving…
                    </>
                  ) : (
                    <>
                      Done
                      <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>
                        check
                      </span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className="flex items-center gap-2 px-8 py-2.5 bg-primary text-on-primary rounded-full font-bold text-sm hover:shadow-xl hover:shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                Continue
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  arrow_forward
                </span>
              </button>
            )}
          </div>

          {completionError && (
            <p className="text-error text-sm text-center mt-4">{completionError}</p>
          )}
        </div>

        {/* Step labels */}
        <div className="flex justify-center gap-8 mt-6 text-xs text-on-surface-variant/40 font-semibold uppercase tracking-wider">
          <span className={step >= 1 ? "text-on-surface-variant" : ""}>Genres</span>
          <span className={step >= 2 ? "text-on-surface-variant" : ""}>Artists</span>
          <span className={step >= 3 ? "text-on-surface-variant" : ""}>Communities</span>
        </div>
      </div>
    </div>
  );
}
