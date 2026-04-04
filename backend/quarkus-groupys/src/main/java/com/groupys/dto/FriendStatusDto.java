package com.groupys.dto;

import java.util.UUID;

/**
 * Current friendship status between the authenticated user and a target user.
 * status values: "NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "ACCEPTED"
 */
public record FriendStatusDto(String status, UUID friendshipId) {}
