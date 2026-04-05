package com.groupys.dto;

import java.util.List;
import java.util.UUID;

public record HotTakeAnswerCreateDto(
        UUID hotTakeId,
        List<String> answers,
        List<String> imageUrls,
        List<String> musicTypes,
        boolean showOnWidget
) {}
