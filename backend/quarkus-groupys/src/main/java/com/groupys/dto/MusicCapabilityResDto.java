package com.groupys.dto;

/**
 * Music capability probe (chat × music plan, ticket 0.2).
 *
 * @param connected           whether the user has a stored Apple Music user token
 * @param subscriptionActive  whether that token currently resolves an active subscription
 *                            (storefront probe); unknown is reported as {@code false} so the
 *                            client falls back to preview-only.
 */
public record MusicCapabilityResDto(boolean connected, boolean subscriptionActive) {}
