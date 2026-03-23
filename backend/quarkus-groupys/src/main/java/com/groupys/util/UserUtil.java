package com.groupys.util;

import com.groupys.dto.UserResDto;
import com.groupys.model.User;

public final class UserUtil {

    private UserUtil() {
    }

    public static UserResDto toDto(User user) {
        return new UserResDto(
                user.id,
                user.clerkId,
                user.username,
                user.displayName,
                user.bio,
                user.country,
                user.bannerUrl,
                user.accentColor,
                user.nameColor,
                user.profileImage,
                user.widgets,
                user.tags,
                user.dateJoined,
                user.spotifyRefreshToken != null
        );
    }
}
