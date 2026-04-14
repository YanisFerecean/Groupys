export interface PostMedia {
  url: string;
  type: string;
  order: number;
}

export interface PostRes {
  id: string;
  title: string | null;
  content: string;
  media: PostMedia[];
  communityId: string;
  communityName: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string | null;
  authorProfileImage: string | null;
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
  userReaction: "like" | "dislike" | null;
  commentCount: number;
}

export interface DiscoveredPost {
  post: PostRes;
  reasonCode: "FRIEND_POSTED" | "FRIEND_LIKED" | "POPULAR_IN_COMMUNITY";
  triggerFriend: {
    userId: string;
    username: string;
    displayName: string | null;
    profileImage: string | null;
  } | null;
}

export interface SuggestedCommunity {
  communityId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  iconType: string | null;
  iconEmoji: string | null;
  iconUrl: string | null;
  memberCount: number;
  score: number;
  explanation: string;
  reasonCodes: string[];
  matchedArtists: { id: string; name: string }[];
  matchedGenres: { id: string; name: string }[];
  sharedCommunityCount: number;
  countryMatch: boolean;
  creatorUsername: string | null;
  creatorDisplayName: string | null;
  creatorProfileImage: string | null;
  friendsInCommunity: {
    userId: string;
    username: string;
    displayName: string | null;
    profileImage: string | null;
  }[];
  communityArtists: { id: string; name: string }[];
}
