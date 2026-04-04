package com.groupys.dto;

import java.time.Instant;
import java.util.UUID;

public record HotTakeAnswerResDto(
        UUID id,
        UUID userId,
        String username,
        String displayName,
        String profileImage,
        String answer,
        String imageUrl,
        String musicType,
        boolean showOnWidget,
        Instant answeredAt
) {}
