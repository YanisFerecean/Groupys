package com.groupys.dto;

public record DiscoveredPostResDto(
        PostResDto post,
        String reasonCode,
        UserSnippetDto triggerFriend
) {}
