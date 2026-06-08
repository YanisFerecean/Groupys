package com.groupys.dto;

import java.util.UUID;

/**
 * Minimal, public (unauthenticated) post fields for link previews / OpenGraph metadata.
 * Intentionally excludes anything sensitive (clerkId, reactions, comments).
 */
public record PostMetaDto(
        UUID id,
        String title,
        String imageUrl,
        String authorUsername,
        String authorDisplayName,
        String communityName
) {}
