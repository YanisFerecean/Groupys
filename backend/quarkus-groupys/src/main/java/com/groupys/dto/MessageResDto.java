package com.groupys.dto;

import java.time.Instant;
import java.util.UUID;

public record MessageResDto(
        UUID id,
        UUID conversationId,
        UUID senderId,
        String senderUsername,
        String senderDisplayName,
        String senderProfileImage,
        String content,
        String messageType,
        boolean isDeleted,
        UUID replyToId,
        Instant createdAt
) {}
