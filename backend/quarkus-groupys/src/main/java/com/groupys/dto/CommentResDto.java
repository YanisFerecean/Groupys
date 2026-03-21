package com.groupys.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CommentResDto(
        UUID id,
        String content,
        UUID postId,
        UUID parentCommentId,
        UUID authorId,
        String authorUsername,
        String authorDisplayName,
        String authorProfileImage,
        Instant createdAt,
        long likeCount,
        long dislikeCount,
        String userReaction,
        List<CommentResDto> replies
) {
}
