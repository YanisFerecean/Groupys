package com.groupys.dto;

import java.time.Instant;

public record DiscoverySyncResDto(
        int artistCount,
        int genreCount,
        int communityRecommendationCount,
        int userRecommendationCount,
        Instant syncedAt
) {
}
