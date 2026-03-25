package com.groupys.dto;

import java.time.Instant;
import java.util.UUID;

public record ParticipantDto(
        UUID userId,
        String username,
        String displayName,
        String profileImage,
        Instant lastReadAt,
        Instant lastSeenAt
) {}
