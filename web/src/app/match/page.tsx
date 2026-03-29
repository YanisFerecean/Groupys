"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Music } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import UserRecommendationCard, {
  type CardHandle,
} from "@/components/match/UserRecommendationCard";
import ActionButtons from "@/components/match/ActionButtons";
import MatchCelebrationModal from "@/components/match/MatchCelebrationModal";
import { useDiscovery } from "@/hooks/useDiscovery";
import { useMatches } from "@/hooks/useMatches";

export default function MatchPage() {
  const { isLoaded } = useAuth();
  const cardRef = useRef<CardHandle>(null);

  const { users, usersLoading, loadUsers, loadMoreUsers, like, dismiss } = useDiscovery();
  const { matches, loadMatches } = useMatches();

  useEffect(() => {
    if (!isLoaded) return;
    void loadUsers();
    void loadMatches();
  }, [isLoaded, loadMatches, loadUsers]);

  const filteredUsers = useMemo(() => {
    const matchedIds = new Set(matches.map((m) => m.otherUserId));
    return users.filter((u) => !matchedIds.has(u.userId));
  }, [users, matches]);

  // Prefetch when 1 card remains
  useEffect(() => {
    if (!usersLoading && filteredUsers.length === 1) {
      void loadMoreUsers();
    }
  }, [filteredUsers.length, usersLoading, loadMoreUsers]);

  const visibleUsers = filteredUsers.slice(0, 3);

  const handleLike = () => {
    if (filteredUsers.length === 0) return;
    cardRef.current?.swipeRight();
  };

  const handlePass = () => {
    if (filteredUsers.length === 0) return;
    cardRef.current?.swipeLeft();
  };

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-64px)] lg:h-[calc(100vh-80px)] bg-surface">
        {/* Header */}
        <div className="px-5 py-4 flex-shrink-0">
          <h1 className="text-4xl font-extrabold tracking-tight text-primary">Mutuals</h1>
        </div>

        {/* Card stack area */}
        <div className="flex-1 flex items-center justify-center px-5 py-4 min-h-0">
          {usersLoading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-on-surface-variant font-medium">Finding mutuals...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <Music className="w-14 h-14 text-on-surface-variant" />
              <p className="text-on-surface-variant text-base font-medium">
                No one new to show right now
              </p>
              <button
                onClick={() => loadUsers(true)}
                className="mt-2 bg-primary text-on-primary font-bold px-6 py-3 rounded-full hover:bg-primary/90 transition-colors"
              >
                Refresh
              </button>
            </div>
          ) : (
            <CardStack
              visibleUsers={visibleUsers}
              cardRef={cardRef}
              onLike={like}
              onDismiss={dismiss}
            />
          )}
        </div>

        {/* Action buttons */}
        {!usersLoading && filteredUsers.length > 0 && (
          <div className="flex justify-center pb-8 pt-4 flex-shrink-0">
            <ActionButtons onPass={handlePass} onLike={handleLike} />
          </div>
        )}
      </div>

      <MatchCelebrationModal />
    </AppShell>
  );
}

// Separate component to avoid re-creating the motion values on every render
function CardStack({
  visibleUsers,
  cardRef,
  onLike,
  onDismiss,
}: {
  visibleUsers: ReturnType<typeof useDiscovery>["users"];
  cardRef: React.RefObject<CardHandle | null>;
  onLike: (user: ReturnType<typeof useDiscovery>["users"][0]) => void;
  onDismiss: (userId: string) => void;
}) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const cardAspectRatio = 3 / 4;
  const cardWidth = Math.min(
    containerSize.width,
    containerSize.height * cardAspectRatio
  );
  const cardHeight = cardWidth / cardAspectRatio;

  return (
    <div
      className="flex items-center justify-center w-full h-full"
      ref={(el) => {
        if (el) {
          const { width, height } = el.getBoundingClientRect();
          if (width !== containerSize.width || height !== containerSize.height) {
            setContainerSize({ width, height });
          }
        }
      }}
    >
      {cardWidth > 0 && (
        <div
          style={{
            width: cardWidth,
            height: cardHeight,
            position: "relative",
          }}
        >
          {[...visibleUsers].reverse().map((user, reverseIdx) => {
            const stackIndex = visibleUsers.length - 1 - reverseIdx;
            return (
              <UserRecommendationCard
                key={user.userId}
                ref={stackIndex === 0 ? cardRef : undefined}
                user={user}
                stackIndex={stackIndex}
                onLike={() => onLike(user)}
                onDismiss={() => onDismiss(user.userId)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
