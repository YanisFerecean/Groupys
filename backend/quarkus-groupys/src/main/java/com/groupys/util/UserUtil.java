package com.groupys.util;

import com.groupys.dto.UserResDto;
import com.groupys.model.User;

public final class UserUtil {

    public static UserResDto toDto(User user, long followerCount, long followingCount) {
        return new UserResDto(
                user.id,
                user.clerkId,
                user.username,
                user.displayName,
                user.bio,
                user.country,
                user.countryCode,
                user.bannerUrl,
                user.bannerText,
                user.accentColor,
                user.nameColor,
                user.profileImage,
                user.widgets,
                user.tags,
                user.dateJoined,
                user.isVerified,
                user.website,
                user.jobTitle,
                user.location,
                user.appleMusicUserToken != null,
                user.lastMusicSyncAt,
                user.tasteSummaryText,
                user.recommendationOptOut,
                user.discoveryVisible,
                followerCount,
                followingCount,
                user.lastFmUsername != null,
                user.lastFmUsername);
    }

    private UserUtil() {
    }
}
