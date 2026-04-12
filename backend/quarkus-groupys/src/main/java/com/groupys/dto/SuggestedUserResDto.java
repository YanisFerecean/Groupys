package com.groupys.dto;

import java.util.List;
import java.util.UUID;

public record SuggestedUserResDto(
        UUID userId,
        String username,
        String displayName,
        String profileImage,
        double score,
        String explanation,
        List<String> reasonCodes,
        List<DiscoveryMatchDto> matchedArtists,
        List<DiscoveryMatchDto> matchedGenres,
        int sharedCommunityCount,
        boolean sameCountry,
        int mutualFollowCount,
        String bio,
        String widgets
) {
}
