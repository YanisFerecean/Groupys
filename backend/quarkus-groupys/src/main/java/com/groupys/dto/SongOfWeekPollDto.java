package com.groupys.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record SongOfWeekPollDto(
        UUID id,
        UUID communityId,
        LocalDate weekStart,
        Instant endsAt,
        List<SongOfWeekCandidateDto> candidates,
        SongOfWeekCandidateDto pinnedWinner,
        String recap
) {}
