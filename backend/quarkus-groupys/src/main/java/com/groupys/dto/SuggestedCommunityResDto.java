package com.groupys.dto;

import java.util.List;
import java.util.UUID;

public record SuggestedCommunityResDto(
        UUID communityId,
        String name,
        String description,
        String imageUrl,
        String bannerUrl,
        String iconType,
        String iconEmoji,
        String iconUrl,
        int memberCount,
        double score,
        String explanation,
        List<String> reasonCodes,
        List<DiscoveryMatchDto> matchedArtists,
        List<DiscoveryMatchDto> matchedGenres,
        int sharedCommunityCount,
        boolean countryMatch
) {
}
