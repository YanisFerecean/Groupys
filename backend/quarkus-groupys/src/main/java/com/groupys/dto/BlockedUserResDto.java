package com.groupys.dto;

import java.time.Instant;
import java.util.UUID;

public record BlockedUserResDto(
        UUID userId,
        String username,
        String displayName,
        String profileImage,
        Instant blockedAt
) {}
