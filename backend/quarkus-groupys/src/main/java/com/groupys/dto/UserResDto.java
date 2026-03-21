package com.groupys.dto;

import java.time.Instant;
import java.util.UUID;

public record UserResDto(
        UUID id,
        String clerkId,
        String username,
        String displayName,
        String bio,
        String country,
        String bannerUrl,
        String accentColor,
        String nameColor,
        String profileImage,
        String widgets,
        Instant dateJoined
) {
}
