package com.groupys.dto;

import java.util.UUID;

/** Lightweight reference to a replied-to message (ticket 3.1). */
public record ReplyStubDto(
        UUID id,
        String senderUsername,
        String senderDisplayName,
        String messageType,
        String snippet
) {}
