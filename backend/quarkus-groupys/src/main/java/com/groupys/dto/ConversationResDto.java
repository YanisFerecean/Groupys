package com.groupys.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ConversationResDto(
        UUID id,
        boolean isGroup,
        String groupName,
        List<ParticipantDto> participants,
        String lastMessage,
        Instant lastMessageAt,
        long unreadCount,
        Instant createdAt,
        Instant updatedAt
) {}
