package com.groupys.dto;

import java.util.UUID;

public record FriendResDto(
    UUID friendshipId,
    UUID userId,
    String username,
    String displayName,
    String profileImage,
    String status        // "PENDING" | "ACCEPTED"
) {}
