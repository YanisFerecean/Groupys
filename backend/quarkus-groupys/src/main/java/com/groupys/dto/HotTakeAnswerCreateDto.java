package com.groupys.dto;

import java.util.UUID;

public record HotTakeAnswerCreateDto(
        UUID hotTakeId,
        String answer,
        String imageUrl,
        String musicType,
        boolean showOnWidget
) {}
