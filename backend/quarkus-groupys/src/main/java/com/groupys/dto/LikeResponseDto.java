package com.groupys.dto;

import java.util.UUID;

public record LikeResponseDto(
        boolean isMatch,
        UUID matchId,
        UUID conversationId
) {}
