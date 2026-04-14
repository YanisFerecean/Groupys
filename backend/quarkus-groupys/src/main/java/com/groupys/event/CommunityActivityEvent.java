package com.groupys.event;

import java.util.UUID;

/**
 * Fired after a post is created or reacted to so that community recommendation
 * caches can be refreshed asynchronously without blocking the write transaction.
 */
public record CommunityActivityEvent(UUID communityId) {}
