package com.groupys.dto;

import jakarta.validation.constraints.NotBlank;

public record DiscoveryActionDto(
        @NotBlank String actionType,
        @NotBlank String surface,
        Integer ttlDays,
        String reasonCode,
        String metadataJson
) {
}
