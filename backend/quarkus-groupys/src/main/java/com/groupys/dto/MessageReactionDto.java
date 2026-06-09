package com.groupys.dto;

import java.util.UUID;

/** A single emoji reaction (ticket 3.2). Clients aggregate counts and detect their own. */
public record MessageReactionDto(String emoji, UUID userId) {}
