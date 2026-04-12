package com.groupys.dto;

public record MusicDeveloperTokenResDto(
        String token,
        long expiresAtEpochSeconds
) {
}
