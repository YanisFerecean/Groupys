package com.groupys.dto;

import java.util.UUID;

public record OwnedCommunityResDto(
        UUID id,
        String name,
        int memberCount,
        String iconEmoji
) {}
