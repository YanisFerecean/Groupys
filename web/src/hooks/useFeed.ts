import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";
const PAGE_SIZE = 20;

interface PostMedia {
  url: string;
  type: string;
  order: number;
}

interface PostRes {
  id: string;
  title: string | null;
  content: string;
  media: PostMedia[];
  communityId: string;
  communityName: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorProfileImage: string;
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
  userReaction: "like" | "dislike" | null;
  commentCount: number;
  feedReasonCode: "FRIEND_POSTED" | "FRIEND_LIKED" | "RECOMMENDED_COMMUNITY" | null;
  triggerFriendUsername: string | null;
  triggerFriendProfileImage: string | null;
}

async function fetchFeed(
  token: string | null,
  page: number,
  size: number
): Promise<PostRes[]> {
  if (!token) {
    throw new Error("Not authenticated");
  }
  const res = await fetch(
    `${API_URL}/posts/feed?page=${page}&size=${size}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch feed: ${res.statusText}`);
  }
  return res.json();
}

async function reactToPost(
  token: string | null,
  postId: string,
  type: "like" | "dislike"
): Promise<PostRes> {
  if (!token) {
    throw new Error("Not authenticated");
  }
  const res = await fetch(`${API_URL}/posts/${postId}/react`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type }),
  });
  if (!res.ok) {
    throw new Error(`Failed to react: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Hook for fetching feed posts with infinite scroll support
 * Uses React Query for caching and stale-while-revalidate pattern
 */
export function useFeed() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const fetchPage = async ({ pageParam = 0 }: { pageParam?: number }): Promise<PostRes[]> => {
    const token = await getToken();
    return fetchFeed(token, pageParam, PAGE_SIZE);
  };

  const infiniteQuery = useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: fetchPage,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length;
    },
    initialPageParam: 0,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Flatten all pages into a single array
  const posts = infiniteQuery.data?.pages.flat() ?? [];
  const hasMore = infiniteQuery.hasNextPage;
  const isLoading = infiniteQuery.isLoading;
  const isLoadingMore = infiniteQuery.isFetchingNextPage;

  const loadMore = async () => {
    if (!infiniteQuery.isFetchingNextPage && infiniteQuery.hasNextPage) {
      await infiniteQuery.fetchNextPage();
    }
  };

  // Mutation for handling reactions
  const reactMutation = useMutation({
    mutationFn: async ({
      postId,
      type,
    }: {
      postId: string;
      type: "like" | "dislike";
    }) => {
      const token = await getToken();
      return reactToPost(token, postId, type);
    },
    onSuccess: (updatedPost: PostRes) => {
      // Update the cache optimistically
      queryClient.setQueryData(["feed"], (oldData: { pages: PostRes[][] } | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: PostRes[]) =>
            page.map((post: PostRes) =>
              post.id === updatedPost.id ? updatedPost : post
            )
          ),
        };
      });
    },
  });

  const handleReact = async (postId: string, type: "like" | "dislike") => {
    await reactMutation.mutateAsync({ postId, type });
  };

  return {
    posts,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    handleReact,
    error: infiniteQuery.error || reactMutation.error,
  };
}

/**
 * Hook for prefetching the next page of feed posts
 * Can be used to preload data before user scrolls
 */
export function usePrefetchFeed() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const prefetchNextPage = async (currentPage: number) => {
    const token = await getToken();
    queryClient.prefetchQuery({
      queryKey: ["feed", "page", currentPage + 1],
      queryFn: () => fetchFeed(token, currentPage + 1, PAGE_SIZE),
      staleTime: 60 * 1000, // 1 minute
    });
  };

  return { prefetchNextPage };
}
