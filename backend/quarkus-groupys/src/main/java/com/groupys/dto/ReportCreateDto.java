package com.groupys.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record ReportCreateDto(
        @NotNull String targetType,
        @NotNull UUID targetId,
        @NotNull String reason,
        @Size(max = 2000) String details
) {}
