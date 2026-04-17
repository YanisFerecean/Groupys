import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { Message } from "@/types/chat";
import { fetchMessages, postMessage } from "@/lib/chat-api";
import { isEncrypted } from "@/lib/crypto";

const MAX_MESSAGES = 300;
const PAGE_SIZE = 30;

type CryptFn = (content: string) => Promise<string>;

// Type for infinite query data
interface InfiniteMessageData {
  pages: Message[][];
}

/**
 * Fetch messages with pagination for React Query
 */
async function fetchMessagesPage(
  conversationId: string,
  page: number,
  token: string | null,
  decryptFn?: CryptFn
): Promise<Message[]> {
  if (!token) {
    throw new Error("Not authenticated");
  }
  const msgs = await fetchMessages(conversationId, page, PAGE_SIZE, token);

  // Decrypt messages if decrypt function is available
  if (decryptFn) {
    return Promise.all(
      msgs.map(async (m) => {
        if (!isEncrypted(m.content)) return m;
        const content = await decryptFn(m.content).catch(
          () => "[Encrypted message — decryption failed]"
        );
        return { ...m, content };
      })
    );
  }
  return msgs;
}

/**
 * Hook for fetching messages with infinite scroll support
 * Uses React Query for caching and stale-while-revalidate pattern
 */
export function useMessagesQuery(
  conversationId: string | null,
  decryptFn?: CryptFn,
  encryptFn?: CryptFn
) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const fetchPage = async ({ pageParam = 0 }: { pageParam?: number }): Promise<Message[]> => {
    if (!conversationId) return [];
    const token = await getToken();
    return fetchMessagesPage(conversationId, pageParam, token, decryptFn);
  };

  const infiniteQuery = useInfiniteQuery({
    queryKey: ["messages", conversationId],
    queryFn: fetchPage,
    getNextPageParam: (lastPage, _allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return _allPages.length;
    },
    initialPageParam: 0,
    enabled: !!conversationId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Flatten all pages (oldest first for messages)
  const messages = infiniteQuery.data?.pages.flat() ?? [];
  const hasMore = infiniteQuery.hasNextPage;
  const isLoading = infiniteQuery.isLoading;
  const isLoadingMore = infiniteQuery.isFetchingNextPage;

  const loadMore = async () => {
    if (!infiniteQuery.isFetchingNextPage && infiniteQuery.hasNextPage) {
      await infiniteQuery.fetchNextPage();
    }
  };

  // Send message mutation with optimistic updates
  const sendMessageMutation = useMutation({
    mutationFn: async ({
      content,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      tempId: _tempId,
    }: {
      content: string;
      tempId: string;
    }): Promise<Message> => {
      if (!conversationId) throw new Error("No conversation");
      const token = await getToken();
      const toSend = encryptFn ? await encryptFn(content) : content;
      return postMessage(conversationId, toSend, token);
    },
    onMutate: async (_variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["messages", conversationId] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<InfiniteMessageData>(["messages", conversationId]);

      // Return context with previous data for rollback
      return { previousData };
    },
    onSuccess: (data, variables) => {
      // Update the cache with the real message
      queryClient.setQueryData<InfiniteMessageData>(["messages", conversationId], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: Message[]) =>
            page.map((m) =>
              m.tempId === variables.tempId ? { ...data, content: variables.content } : m
            )
          ),
        };
      });
    },
    onError: (_err, _variables, context) => {
      // Rollback to the previous value
      if (context?.previousData) {
        queryClient.setQueryData(["messages", conversationId], context.previousData);
      }
    },
  });

  // Add a new message to the cache (for WebSocket updates)
  const addMessage = (message: Message) => {
    queryClient.setQueryData<InfiniteMessageData>(["messages", conversationId], (oldData) => {
      if (!oldData) return oldData;

      // Check if message already exists
      const exists = oldData.pages.some((page: Message[]) =>
        page.some((m) => m.id === message.id)
      );
      if (exists) return oldData;

      // Add to first page (newest messages)
      const newPages = [[message, ...oldData.pages[0]], ...oldData.pages.slice(1)];

      // Limit total messages
      const allMessages = newPages.flat();
      if (allMessages.length > MAX_MESSAGES) {
        const trimmed = allMessages.slice(0, MAX_MESSAGES);
        // Reconstruct pages
        const pages: Message[][] = [];
        for (let i = 0; i < trimmed.length; i += PAGE_SIZE) {
          pages.push(trimmed.slice(i, i + PAGE_SIZE));
        }
        return { ...oldData, pages };
      }

      return { ...oldData, pages: newPages };
    });
  };

  // Update a message (for reactions, edits, etc.)
  const updateMessage = (messageId: string, updates: Partial<Message>) => {
    queryClient.setQueryData<InfiniteMessageData>(["messages", conversationId], (oldData) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page: Message[]) =>
          page.map((m) => (m.id === messageId ? { ...m, ...updates } : m))
        ),
      };
    });
  };

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    sendMessageMutation,
    addMessage,
    updateMessage,
    error: infiniteQuery.error || sendMessageMutation.error,
  };
}

/**
 * Hook for prefetching messages
 */
export function usePrefetchMessages() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const prefetchMessages = async (conversationId: string, decryptFn?: CryptFn) => {
    const token = await getToken();
    queryClient.prefetchInfiniteQuery({
      queryKey: ["messages", conversationId],
      queryFn: ({ pageParam = 0 }) => fetchMessagesPage(conversationId, pageParam, token, decryptFn),
      initialPageParam: 0,
      getNextPageParam: (lastPage: Message[]) => {
        if (lastPage.length < PAGE_SIZE) return undefined;
        return 1;
      },
      staleTime: 60 * 1000, // 1 minute
    });
  };

  return { prefetchMessages };
}
