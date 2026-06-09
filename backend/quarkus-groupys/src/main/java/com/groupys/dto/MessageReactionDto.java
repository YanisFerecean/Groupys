package com.groupys.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.UUID;

/** A typed emoji or track reaction (tickets 3.2 / 4.5). */
public record MessageReactionDto(String type, String emoji, JsonNode track, UUID userId) {}
