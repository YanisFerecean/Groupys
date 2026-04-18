package com.groupys.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record UserResDto(
        UUID id,
        String clerkId,
        String username,
        String displayName,
        String bio,
        String country,
        String countryCode,
        String bannerUrl,
        String bannerText,
        String accentColor,
        String nameColor,
        String profileImage,
        String widgets,
        List<String> tags,
        Instant dateJoined,
        boolean isVerified,
        String website,
        String jobTitle,
        String location,
        boolean musicConnected,
        Instant lastMusicSyncAt,
        String tasteSummaryText,
        boolean recommendationOptOut,
        boolean discoveryVisible,
        long followerCount,
        long followingCount,
        boolean lastFmConnected,
        String lastFmUsername
) {
}
