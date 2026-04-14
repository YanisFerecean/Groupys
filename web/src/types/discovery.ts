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
}
