export interface UserMatch {
  matchId: string;
  otherUserId: string;
  otherUsername: string;
  otherDisplayName: string | null;
  otherProfileImage: string | null;
  conversationId: string | null;
  status: "ACTIVE" | "UNMATCHED" | "USER_A_HIDDEN" | "USER_B_HIDDEN";
  matchedAt: string;
  unreadCount: number;
}

export interface LikeResponse {
  isMatch: boolean;
  matchId: string | null;
  conversationId: string | null;
}

export interface SentLike {
  targetUserId: string;
  targetUsername: string;
  targetDisplayName: string | null;
  targetProfileImage: string | null;
  likedAt: string;
}

export interface SuggestedUser {
  userId: string;
  username: string;
  displayName: string | null;
  profileImage: string | null;
  score: number;
  explanation: string;
  reasonCodes: string[];
  matchedArtists: { id: string; name: string }[];
  matchedGenres: { id: string; name: string }[];
  sharedCommunityCount: number;
  sameCountry: boolean;
  mutualFollowCount: number;
  bio?: string | null;
  widgets?: string | null;
}
