package com.groupys.dto;

import java.time.Instant;
import java.util.UUID;

public record MatchResDto(
        UUID matchId,
        UUID otherUserId,
        String otherUsername,
        String otherDisplayName,
        String otherProfileImage,
        UUID conversationId,
        String status,
        Instant matchedAt,
        long unreadCount
) {}
