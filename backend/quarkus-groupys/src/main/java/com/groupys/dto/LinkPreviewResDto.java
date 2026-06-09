package com.groupys.dto;

import java.util.Map;

/** Resolved URL ready to send as a structured chat message (ticket 3.7). */
public record LinkPreviewResDto(
        String messageType,
        String fallbackText,
        Map<String, Object> payload
) {}
