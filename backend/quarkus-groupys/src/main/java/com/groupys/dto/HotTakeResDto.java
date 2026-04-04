package com.groupys.dto;

import java.time.Instant;
import java.util.UUID;

public record HotTakeResDto(
        UUID id,
        String question,
        String weekLabel,
        String answerType,
        Instant createdAt
) {}
