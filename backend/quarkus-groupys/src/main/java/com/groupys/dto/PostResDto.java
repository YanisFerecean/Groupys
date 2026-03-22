package com.groupys.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PostResDto(
        UUID id,
        String content,
        List<PostMediaDto> media,
        UUID communityId,
        String communityName,
        UUID authorId,
        String authorUsername,
        String authorDisplayName,
        String authorProfileImage,
        String authorClerkId,
        Instant createdAt,
        long likeCount,
        long dislikeCount,
        String userReaction,
        long commentCount,
        String title
) {
    public record PostMediaDto(String url, String type, int order) {}
}
