"use client";

import { useRouter } from "next/navigation";
import { Heart, User } from "lucide-react";
import { useMatchStore } from "@/store/matchStore";
import Image from "next/image";

export default function MatchCelebrationModal() {
  const router = useRouter();
  const { pendingMatchModal, setPendingMatchModal } = useMatchStore();

  if (!pendingMatchModal) return null;

  const handleStartChatting = () => {
    setPendingMatchModal(null);
    if (pendingMatchModal.conversationId) {
      router.push(`/chat/${pendingMatchModal.conversationId}`);
    }
  };

  const handleKeepSwiping = () => {
    setPendingMatchModal(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleKeepSwiping}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-3xl bg-surface px-6 py-8 flex flex-col items-center gap-6 shadow-2xl">
        {/* Heart icon */}
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
          <Heart className="w-8 h-8 text-on-primary" fill="currentColor" />
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-primary">
            It&apos;s a Match!
          </h2>
          <p className="text-base text-on-surface-variant">
            You and{" "}
            {pendingMatchModal.otherDisplayName ?? pendingMatchModal.otherUsername}{" "}
            both liked each other.
          </p>
        </div>

        {/* Profile image */}
        <div className="flex items-center gap-4">
          {pendingMatchModal.otherProfileImage ? (
            <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0" style={{ border: "3px solid var(--color-primary)" }}>
              <Image
                src={pendingMatchModal.otherProfileImage}
                alt={pendingMatchModal.otherDisplayName ?? pendingMatchModal.otherUsername}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div
              className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center"
              style={{ border: "3px solid var(--color-primary)" }}
            >
              <User className="w-9 h-9 text-on-surface-variant" />
            </div>
          )}
        </div>

        {/* CTA buttons */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={handleStartChatting}
            className="w-full rounded-full bg-primary py-4 text-on-primary font-bold text-base hover:bg-primary/90 transition-colors"
          >
            Start Chatting
          </button>
          <button
            onClick={handleKeepSwiping}
            className="w-full rounded-full bg-surface-container-high py-4 text-on-surface font-semibold text-base hover:bg-surface-container transition-colors"
          >
            Keep Swiping
          </button>
        </div>
      </div>
    </div>
  );
}
