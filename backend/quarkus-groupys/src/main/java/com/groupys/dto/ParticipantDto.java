package com.groupys.dto;

import java.time.Instant;
import java.util.UUID;

public record ParticipantDto(
        UUID userId,
        String username,
        String displayName,
        String profileImage,
        Instant lastReadAt,
        Instant lastSeenAt,
        /** Whether this participant has an active Apple Music subscription (cached from their last
         *  capability probe). Gates full-playback social features like Listen Together (ticket 7.1). */
        boolean musicSubscriptionActive
) {}
