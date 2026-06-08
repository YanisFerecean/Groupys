package com.groupys.util;

import com.groupys.dto.CommunityResDto;
import com.groupys.model.Community;
import jakarta.ws.rs.BadRequestException;

import java.util.regex.Pattern;

public final class CommunityUtil {

    private CommunityUtil() {
    }

    public static CommunityResDto toDto(Community community) {
        return new CommunityResDto(
                community.id,
                community.name,
                community.description,
                community.genre,
                community.country,
                community.countryCode,
                community.imageUrl,
                community.bannerUrl,
                community.iconType,
                community.iconEmoji,
                community.iconUrl,
                community.tags != null ? new java.util.ArrayList<>(community.tags) : java.util.List.of(),
                community.artist != null ? community.artist.getId() : null,
                community.memberCount,
                community.createdBy != null ? community.createdBy.id : null,
                community.createdAt,
                community.visibility,
                community.discoveryEnabled,
                community.lastProfileRefreshAt,
                community.tasteSummaryText,
                community.blacklistedWords != null ? new java.util.ArrayList<>(community.blacklistedWords) : java.util.List.of()
        );
    }

    public static void enforceBlacklist(Community community, String... texts) {
        if (community.blacklistedWords == null || community.blacklistedWords.isEmpty()) return;
        for (String text : texts) {
            if (text == null || text.isBlank()) continue;
            String lower = text.toLowerCase();
            for (String word : community.blacklistedWords) {
                Pattern pattern = Pattern.compile(
                        "(?<![\\w])" + Pattern.quote(word) + "(?![\\w])",
                        Pattern.CASE_INSENSITIVE
                );
                if (pattern.matcher(lower).find()) {
                    throw new BadRequestException("Your content contains a word that is not allowed in this community");
                }
            }
        }
    }
}
