package com.groupys.service;

import io.vertx.mutiny.redis.client.Response;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ChatRedisStateService {

    private static final Duration UNREAD_TTL = Duration.ofDays(30);

    @Inject
    RedisSupport redisSupport;

    public boolean allowMessageSend(UUID userId, int max, long windowMs) {
        long window = Math.max(1L, System.currentTimeMillis() / Math.max(1L, windowMs));
        String key = "rl:chat:send:%s:%s".formatted(userId, window);
        Response incremented = redisSupport.run(api -> api.incr(key)).orElse(null);
        if (incremented == null) {
            return true;
        }
        long value = parseLong(incremented);
        if (value == 1L) {
            redisSupport.run(api -> api.expire(List.of(key, "20")));
        }
        return value <= max;
    }

    public void incrementUnreadForRecipients(UUID conversationId, UUID senderId, List<UUID> participantIds) {
        for (UUID participantId : participantIds) {
            if (participantId.equals(senderId)) {
                continue;
            }
            String unreadHashKey = unreadHashKey(participantId);
            String totalKey = unreadTotalKey(participantId);
            redisSupport.run(api -> api.hincrby(unreadHashKey, conversationId.toString(), "1"));
            redisSupport.run(api -> api.incrby(totalKey, "1"));
            expireUnreadKeys(unreadHashKey, totalKey);
        }
    }

    public void resetUnread(UUID userId, UUID conversationId) {
        String unreadHashKey = unreadHashKey(userId);
        String totalKey = unreadTotalKey(userId);

        Response existing = redisSupport.run(api -> api.hget(unreadHashKey, conversationId.toString())).orElse(null);
        long previous = existing == null ? 0L : parseLong(existing);
        redisSupport.run(api -> api.hset(List.of(unreadHashKey, conversationId.toString(), "0")));
        if (previous > 0) {
            redisSupport.run(api -> api.decrby(totalKey, String.valueOf(previous)));
        }
        redisSupport.run(api -> api.set(List.of(totalKey, String.valueOf(Math.max(0L, readNonNegative(totalKey))))));
        expireUnreadKeys(unreadHashKey, totalKey);
    }

    public void setUnread(UUID userId, UUID conversationId, long unreadCount) {
        String unreadHashKey = unreadHashKey(userId);
        redisSupport.run(api -> api.hset(List.of(unreadHashKey, conversationId.toString(), String.valueOf(Math.max(0L, unreadCount)))));
        redisSupport.run(api -> api.expire(List.of(unreadHashKey, String.valueOf(UNREAD_TTL.getSeconds()))));
    }

    private long readNonNegative(String key) {
        Response current = redisSupport.run(api -> api.get(key)).orElse(null);
        long parsed = current == null ? 0L : parseLong(current);
        return Math.max(0L, parsed);
    }

    private void expireUnreadKeys(String unreadHashKey, String totalKey) {
        String ttl = String.valueOf(UNREAD_TTL.getSeconds());
        redisSupport.run(api -> api.expire(List.of(unreadHashKey, ttl)));
        redisSupport.run(api -> api.expire(List.of(totalKey, ttl)));
    }

    private long parseLong(Response response) {
        try {
            return Long.parseLong(response.toString());
        } catch (Exception ignored) {
            return 0L;
        }
    }

    private String unreadHashKey(UUID userId) {
        return "chat:unread:%s".formatted(userId);
    }

    private String unreadTotalKey(UUID userId) {
        return "chat:unread:total:%s".formatted(userId);
    }
}
