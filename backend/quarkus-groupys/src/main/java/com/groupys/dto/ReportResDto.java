package com.groupys.dto;

import java.time.Instant;
import java.util.UUID;

public record ReportResDto(
        UUID id,
        UUID reporterId,
        String reporterUsername,
        String targetType,
        UUID targetId,
        String reason,
        String details,
        String status,
        Instant createdAt
) {}
