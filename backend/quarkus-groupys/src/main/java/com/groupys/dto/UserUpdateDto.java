package com.groupys.dto;

import jakarta.validation.constraints.Size;

import java.util.List;

public record UserUpdateDto(
        @Size(max = 50) String displayName,
        @Size(max = 300) String bio,
        String country,
        @Size(min = 2, max = 2) String countryCode,
        String bannerUrl,
        String bannerText,
        @Size(max = 7) String accentColor,
        @Size(max = 7) String nameColor,
        String profileImage,
        String widgets,
        List<String> tags,
        String website,
        String jobTitle,
        String location,
        String tasteSummaryText,
        Boolean recommendationOptOut,
        Boolean discoveryVisible
) {
}
