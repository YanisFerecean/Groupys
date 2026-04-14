package com.groupys.dto;

import java.util.UUID;

public record UserSnippetDto(
        UUID userId,
        String username,
        String displayName,
        String profileImage
) {
}
