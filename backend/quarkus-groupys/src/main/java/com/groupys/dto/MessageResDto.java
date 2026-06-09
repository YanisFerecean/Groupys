package com.groupys.dto;

import com.fasterxml.jackson.databind.JsonNode;

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
        JsonNode payload,
        boolean isDeleted,
        UUID replyToId,
        ReplyStubDto replyTo,
        Instant createdAt
) {}
