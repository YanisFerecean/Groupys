package com.groupys.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.UUID;

/** A user's ephemeral daily-song status (ticket 5.2). */
public record DailySongResDto(
        UUID userId,
        String username,
        String displayName,
        String profileImage,
        JsonNode track,
        Instant createdAt,
        Instant expiresAt
) {}
