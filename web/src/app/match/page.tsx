"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { Music } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import UserHingeProfile, { type HingeProfileHandle } from "@/components/match/UserHingeProfile";
import ActionButtons from "@/components/match/ActionButtons";
import MatchCelebrationModal from "@/components/match/MatchCelebrationModal";
import { useDiscovery } from "@/hooks/useDiscovery";
import { useMatches } from "@/hooks/useMatches";

export default function MatchPage() {
  const { isLoaded } = useAuth();
  const profileRef = useRef<HingeProfileHandle>(null);

  const { users, usersLoading, loadUsers, loadMoreUsers, like, dismiss } = useDiscovery();
  const { matches, loadMatches } = useMatches();

  useEffect(() => {
    if (!isLoaded) return;
    void Promise.all([loadUsers(), loadMatches()]);
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

  const currentUser = filteredUsers[0];

  const handleLike = () => {
    if (!currentUser) return;
    profileRef.current?.scrollToTop();
    like(currentUser);
  };

  const handlePass = () => {
    if (!currentUser) return;
    profileRef.current?.scrollToTop();
    dismiss(currentUser.userId);
  };

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-64px)] lg:h-[calc(100vh-80px)] bg-surface overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 flex-shrink-0">
          <h1 className="text-4xl font-extrabold tracking-tight text-primary">Mutuals</h1>
        </div>

        {/* Content */}
        {usersLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-on-surface-variant font-medium">Finding mutuals...</p>
          </div>
        ) : !currentUser ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-10">
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
          <UserHingeProfile
            key={currentUser.userId}
            ref={profileRef}
            user={currentUser}
          />
        )}

        {/* Floating action buttons */}
        {!usersLoading && !!currentUser && (
          <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
            <div className="pointer-events-auto">
              <ActionButtons onPass={handlePass} onLike={handleLike} />
            </div>
          </div>
        )}
      </div>

      <MatchCelebrationModal />
    </AppShell>
  );
}
