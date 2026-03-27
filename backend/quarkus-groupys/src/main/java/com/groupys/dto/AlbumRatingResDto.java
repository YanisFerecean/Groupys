package com.groupys.dto;

import java.time.Instant;
import java.util.UUID;

public record AlbumRatingResDto(
        UUID id,
        Long albumId,
        String albumTitle,
        String albumCoverUrl,
        String artistName,
        UUID userId,
        String username,
        String displayName,
        String profileImage,
        int score,
        String review,
        Instant createdAt,
        Instant updatedAt
) {
}
