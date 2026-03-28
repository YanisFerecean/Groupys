package com.groupys.dto;

import java.util.UUID;

public record UserFollowResDto(
        UUID userId,
        boolean following
) {
}
