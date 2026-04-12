package com.groupys.util;

import com.groupys.dto.UserResDto;
import com.groupys.model.User;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UserUtilTest {

    @Test
    void userDtoShowsMusicConnectedWhenMusicTokenExists() {
        User user = new User();
        user.appleMusicUserToken = "music-user-token";

        UserResDto dto = UserUtil.toDto(user, 0, 0);

        assertTrue(dto.musicConnected());
    }

    @Test
    void userDtoShowsMusicDisconnectedWhenMusicTokenMissing() {
        User user = new User();
        user.appleMusicUserToken = null;

        UserResDto dto = UserUtil.toDto(user, 0, 0);

        assertFalse(dto.musicConnected());
    }
}
