package com.groupys.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.UUID;

public record ListeningPartyDto(
        UUID id,
        UUID conversationId,
        UUID hostUserId,
        String hostClerkId,
        Instant startAt,
        JsonNode track,
        String status
) {}
