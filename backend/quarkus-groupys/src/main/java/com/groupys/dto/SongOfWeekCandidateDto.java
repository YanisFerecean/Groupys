package com.groupys.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.UUID;

public record SongOfWeekCandidateDto(
        UUID id,
        JsonNode track,
        long voteCount,
        boolean votedByMe,
        UUID submittedByUserId
) {}
