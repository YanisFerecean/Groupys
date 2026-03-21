package com.groupys.dto;

import java.time.Instant;
import java.util.UUID;

public record CommunityMemberResDto(
        UUID id,
        UUID userId,
        String username,
        String displayName,
        String profileImage,
        String role,
        Instant joinedAt
) {
}
