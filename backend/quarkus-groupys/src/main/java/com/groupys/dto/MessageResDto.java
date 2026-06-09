package com.groupys.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.List;
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
        boolean edited,
        UUID replyToId,
        ReplyStubDto replyTo,
        List<MessageReactionDto> reactions,
        Instant createdAt
) {}
