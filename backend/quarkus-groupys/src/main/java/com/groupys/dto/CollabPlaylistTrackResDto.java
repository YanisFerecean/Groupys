package com.groupys.dto;

import java.time.Instant;
import java.util.UUID;

/** One track in a conversation's collaborative playlist, with who added it (ticket 6.1 read view). */
public record CollabPlaylistTrackResDto(
        String trackId,
        String title,
        String artist,
        String album,
        String artworkUrl,
        String previewUrl,
        String appleMusicId,
        UUID addedByUserId,
        String addedByUsername,
        String addedByDisplayName,
        String addedByProfileImage,
        Instant addedAt
) {}
