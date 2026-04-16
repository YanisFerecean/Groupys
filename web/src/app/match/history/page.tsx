"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { ChevronLeft, Heart, Send } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import { MatchHistoryListItem } from "@/components/match/MatchHistoryListItem";
import { SentLikeListItem } from "@/components/match/SentLikeListItem";
import { fetchMatchHistory, fetchSentLikes, withdrawLike } from "@/lib/match-api";
import type { SentLike, UserMatch } from "@/types/match";

const PAGE_SIZE = 20;
type HistoryTab = "matches" | "likes";

function mergeUniqueBy<T>(
  previous: T[],
  incoming: T[],
  getKey: (item: T) => string,
  reset: boolean
): T[] {
  const merged = reset ? [...incoming] : [...previous, ...incoming];
  const seen = new Set<string>();
  return merged.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function MatchHistoryPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [activeTab, setActiveTab] = useState<HistoryTab>("matches");

  const [matches, setMatches] = useState<UserMatch[]>([]);
  const [matchesPage, setMatchesPage] = useState(0);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesLoadingMore, setMatchesLoadingMore] = useState(false);
  const [matchesHasMore, setMatchesHasMore] = useState(true);
  const [matchesInitialized, setMatchesInitialized] = useState(false);

  const [likes, setLikes] = useState<SentLike[]>([]);
  const [likesPage, setLikesPage] = useState(0);
  const [likesLoading, setLikesLoading] = useState(false);
  const [likesLoadingMore, setLikesLoadingMore] = useState(false);
  const [likesHasMore, setLikesHasMore] = useState(true);
  const [likesInitialized, setLikesInitialized] = useState(false);
  const [withdrawingTargetUserId, setWithdrawingTargetUserId] = useState<string | null>(null);

  const loadMatches = useCallback(
    async (reset = false) => {
      const nextPage = reset ? 0 : matchesPage;
      if (reset) {
        setMatchesLoading(true);
      } else {
        if (matchesLoadingMore || !matchesHasMore) return;
        setMatchesLoadingMore(true);
      }
      try {
        const token = await getTokenRef.current();
        const data = await fetchMatchHistory(token, nextPage, PAGE_SIZE);
        setMatches((prev) =>
          mergeUniqueBy(prev, data, (m) => m.matchId, reset)
        );
        setMatchesPage(nextPage + 1);
        setMatchesHasMore(data.length === PAGE_SIZE);
      } catch (err) {
        console.error("[match-history] failed to load matches", err);
      } finally {
        setMatchesInitialized(true);
        setMatchesLoading(false);
        setMatchesLoadingMore(false);
      }
    },
    [matchesHasMore, matchesLoadingMore, matchesPage]
  );

  const loadLikes = useCallback(
    async (reset = false) => {
      const nextPage = reset ? 0 : likesPage;
      if (reset) {
        setLikesLoading(true);
      } else {
        if (likesLoadingMore || !likesHasMore) return;
        setLikesLoadingMore(true);
      }
      try {
        const token = await getTokenRef.current();
        const data = await fetchSentLikes(token, nextPage, PAGE_SIZE);
        setLikes((prev) =>
          mergeUniqueBy(prev, data, (l) => l.targetUserId, reset)
        );
        setLikesPage(nextPage + 1);
        setLikesHasMore(data.length === PAGE_SIZE);
      } catch (err) {
        console.error("[match-history] failed to load sent likes", err);
      } finally {
        setLikesInitialized(true);
        setLikesLoading(false);
        setLikesLoadingMore(false);
      }
    },
    [likesHasMore, likesLoadingMore, likesPage]
  );

  useEffect(() => {
    if (!matchesInitialized) void loadMatches(true);
  }, [loadMatches, matchesInitialized]);

  useEffect(() => {
    if (activeTab === "likes" && !likesInitialized) void loadLikes(true);
  }, [activeTab, likesInitialized, loadLikes]);

  const handleWithdraw = (targetUserId: string) => {
    setWithdrawingTargetUserId(targetUserId);
    void (async () => {
      try {
        const token = await getTokenRef.current();
        await withdrawLike(targetUserId, token);
        setLikes((prev) => prev.filter((l) => l.targetUserId !== targetUserId));
      } catch (err) {
        console.error("[match-history] failed to withdraw like", err);
      } finally {
        setWithdrawingTargetUserId((cur) => (cur === targetUserId ? null : cur));
      }
    })();
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (!nearBottom) return;
    if (activeTab === "matches" && matchesHasMore && !matchesLoadingMore) {
      void loadMatches(false);
    } else if (activeTab === "likes" && likesHasMore && !likesLoadingMore) {
      void loadLikes(false);
    }
  };

  const isLoading = activeTab === "matches" ? matchesLoading : likesLoading;
  const isLoadingMore =
    activeTab === "matches" ? matchesLoadingMore : likesLoadingMore;
  const items = activeTab === "matches" ? matches : likes;

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-64px)] lg:h-[calc(100vh-80px)] bg-surface">
        {/* Header */}
        <div className="max-w-4xl mx-auto w-full px-5 pb-4 pt-4 flex-shrink-0">
          <button
            onClick={() => router.back()}
            className="mb-5 flex items-center gap-1 self-start rounded-full bg-surface-container px-3 py-2 hover:bg-surface-container-high transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-on-surface" />
            <span className="text-sm font-semibold text-on-surface">Back</span>
          </button>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary">
            Connections
          </h1>
          <p className="mt-2 text-[15px] font-medium text-on-surface-variant">
            Browse past matches and manage likes you sent before they turned into a match.
          </p>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto w-full flex gap-3 px-5 pb-4 flex-shrink-0">
          <button
            onClick={() => setActiveTab("matches")}
            className={`flex-1 rounded-full px-4 py-3 text-sm font-bold uppercase tracking-wide transition-colors ${
              activeTab === "matches"
                ? "bg-primary text-on-primary"
                : "bg-surface-container text-on-surface hover:bg-surface-container-high"
            }`}
          >
            Match History
          </button>
          <button
            onClick={() => setActiveTab("likes")}
            className={`flex-1 rounded-full px-4 py-3 text-sm font-bold uppercase tracking-wide transition-colors ${
              activeTab === "likes"
                ? "bg-primary text-on-primary"
                : "bg-surface-container text-on-surface hover:bg-surface-container-high"
            }`}
          >
            Sent Likes
          </button>
        </div>

        {/* List */}
        <div
          className="flex-1 overflow-y-auto pb-8"
          onScroll={handleScroll}
        >
          <div className="max-w-4xl mx-auto w-full px-5 min-h-full flex flex-col">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-10 py-16">
              {activeTab === "matches" ? (
                <>
                  <Heart className="w-11 h-11 text-on-surface-variant" />
                  <p className="text-lg font-bold text-on-surface">No match history yet</p>
                  <p className="text-sm font-medium text-on-surface-variant">
                    When you match with someone, they will appear here even if the connection ends
                    later.
                  </p>
                </>
              ) : (
                <>
                  <Send className="w-11 h-11 text-on-surface-variant" />
                  <p className="text-lg font-bold text-on-surface">No sent likes waiting</p>
                  <p className="text-sm font-medium text-on-surface-variant">
                    Likes that have not turned into a match yet will show up here, and you can
                    remove them.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {activeTab === "matches"
                ? (items as UserMatch[]).map((match) => (
                    <MatchHistoryListItem key={match.matchId} match={match} />
                  ))
                : (items as SentLike[]).map((like) => (
                    <SentLikeListItem
                      key={like.targetUserId}
                      like={like}
                      busy={withdrawingTargetUserId === like.targetUserId}
                      onWithdraw={() => handleWithdraw(like.targetUserId)}
                    />
                  ))}
              {isLoadingMore && (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
