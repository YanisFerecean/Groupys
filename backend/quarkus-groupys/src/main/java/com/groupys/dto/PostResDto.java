package com.groupys.dto;

import java.time.Instant;
import java.util.UUID;

public record PostResDto(
        UUID id,
        String content,
        String mediaUrl,
        String mediaType,
        UUID communityId,
        String communityName,
        UUID authorId,
        String authorUsername,
        String authorDisplayName,
        String authorProfileImage,
        Instant createdAt,
        long likeCount,
        long dislikeCount,
        String userReaction,
        long commentCount
) {
}
