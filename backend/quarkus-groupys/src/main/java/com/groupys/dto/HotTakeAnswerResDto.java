package com.groupys.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record HotTakeAnswerResDto(
        UUID id,
        UUID userId,
        String username,
        String displayName,
        String profileImage,
        List<String> answers,
        List<String> imageUrls,
        List<String> musicTypes,
        boolean showOnWidget,
        Instant answeredAt
) {}
