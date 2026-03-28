package com.groupys.dto;

import java.time.Instant;
import java.util.UUID;

public record SentLikeResDto(
        UUID targetUserId,
        String targetUsername,
        String targetDisplayName,
        String targetProfileImage,
        Instant likedAt
) {}
