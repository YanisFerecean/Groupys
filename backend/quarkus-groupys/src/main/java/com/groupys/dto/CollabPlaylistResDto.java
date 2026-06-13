package com.groupys.dto;

import java.util.List;

/** Full collaborative playlist for a conversation — every added track, not the capped card preview. */
public record CollabPlaylistResDto(
        String id,
        String title,
        int trackCount,
        List<CollabPlaylistTrackResDto> tracks
) {}
