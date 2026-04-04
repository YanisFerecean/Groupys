package com.groupys.service;

import com.groupys.model.CommunityRecommendationCache;
import com.groupys.model.UserSimilarityCache;
import io.quarkus.logging.Log;
import io.vertx.mutiny.redis.client.Response;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@ApplicationScoped
public class DiscoveryRedisCacheService {

    private static final Duration BASE_TTL = Duration.ofHours(12);
    private static final Duration JITTER_MAX = Duration.ofMinutes(30);

    @Inject
    RedisSupport redisSupport;

    public List<RankedRecommendation> readUserRecommendations(UUID userId, int limit) {
        return readRankedWithMetadata(userRecoKey(userId), id -> userMetaKey(userId, id), limit);
    }

    public List<RankedRecommendation> readCommunityRecommendations(UUID userId, int limit) {
        return readRankedWithMetadata(communityRecoKey(userId), id -> communityMetaKey(userId, id), limit);
    }

    public void writeUserRecommendations(UUID userId, List<UserSimilarityCache> caches) {
        String zsetKey = userRecoKey(userId);
        clearRecommendationSet(zsetKey, id -> userMetaKey(userId, id));
        for (UserSimilarityCache cache : caches) {
            String candidateId = cache.candidateUser.id.toString();
            redisSupport.run(api -> api.zadd(List.of(zsetKey, String.valueOf(cache.score), candidateId)));
            redisSupport.run(api -> api.set(List.of(userMetaKey(userId, candidateId), nonBlankJson(cache.explanationJson))));
            expire(userMetaKey(userId, candidateId));
        }
        expire(zsetKey);
    }

    public void writeCommunityRecommendations(UUID userId, List<CommunityRecommendationCache> caches) {
        String zsetKey = communityRecoKey(userId);
        clearRecommendationSet(zsetKey, id -> communityMetaKey(userId, id));
        for (CommunityRecommendationCache cache : caches) {
            String communityId = cache.community.id.toString();
            redisSupport.run(api -> api.zadd(List.of(zsetKey, String.valueOf(cache.score), communityId)));
            redisSupport.run(api -> api.set(List.of(communityMetaKey(userId, communityId), nonBlankJson(cache.explanationJson))));
            expire(communityMetaKey(userId, communityId));
        }
        expire(zsetKey);
    }

    public void removeUserCandidate(UUID userId, UUID candidateUserId) {
        redisSupport.run(api -> api.zrem(List.of(userRecoKey(userId), candidateUserId.toString())));
        redisSupport.run(api -> api.del(List.of(userMetaKey(userId, candidateUserId.toString()))));
    }

    public void removeCommunityCandidate(UUID userId, UUID communityId) {
        redisSupport.run(api -> api.zrem(List.of(communityRecoKey(userId), communityId.toString())));
        redisSupport.run(api -> api.del(List.of(communityMetaKey(userId, communityId.toString()))));
    }

    public void clearUserRecommendations(UUID userId) {
        clearRecommendationSet(userRecoKey(userId), id -> userMetaKey(userId, id));
    }

    public void clearCommunityRecommendations(UUID userId) {
        clearRecommendationSet(communityRecoKey(userId), id -> communityMetaKey(userId, id));
    }

    public void removeCommunityFromAllUsers(UUID communityId) {
        // Best-effort scan and cleanup for global invalidation events.
        String cursor = "0";
        do {
            String scanCursor = cursor;
            Response scan = redisSupport.run(api -> api.scan(List.of(scanCursor, "MATCH", "reco:user:*:communities", "COUNT", "200")))
                    .orElse(null);
            if (scan == null || scan.size() < 2) {
                break;
            }
            cursor = scan.get(0).toString();
            Response keys = scan.get(1);
            for (int i = 0; i < keys.size(); i++) {
                String zsetKey = keys.get(i).toString();
                redisSupport.run(api -> api.zrem(List.of(zsetKey, communityId.toString())));
            }
        } while (!"0".equals(cursor));
    }

    public boolean hasUserRecommendations(UUID userId) {
        Response resp = redisSupport.run(api -> api.exists(List.of(userRecoKey(userId)))).orElse(null);
        if (resp == null) {
            return false;
        }
        return parseLong(resp) > 0;
    }

    public boolean hasCommunityRecommendations(UUID userId) {
        Response resp = redisSupport.run(api -> api.exists(List.of(communityRecoKey(userId)))).orElse(null);
        if (resp == null) {
            return false;
        }
        return parseLong(resp) > 0;
    }

    private List<RankedRecommendation> readRankedWithMetadata(String zsetKey,
                                                              java.util.function.Function<String, String> metaKeyResolver,
                                                              int limit) {
        if (limit <= 0) {
            return List.of();
        }
        Response response = redisSupport.run(api -> api.zrevrange(List.of(
                zsetKey,
                "0",
                String.valueOf(limit - 1),
                "WITHSCORES"
        ))).orElse(null);
        if (response == null || response.size() == 0) {
            return List.of();
        }

        List<RankedRecommendation> ranked = new ArrayList<>();
        for (int i = 0; i + 1 < response.size(); i += 2) {
            String idString = response.get(i).toString();
            UUID id;
            try {
                id = UUID.fromString(idString);
            } catch (Exception ignored) {
                continue;
            }
            double score;
            try {
                score = Double.parseDouble(response.get(i + 1).toString());
            } catch (Exception e) {
                score = 0d;
            }
            String explanationJson = "{}";
            Response meta = redisSupport.run(api -> api.get(metaKeyResolver.apply(idString))).orElse(null);
            if (meta != null && meta.toString() != null && !meta.toString().isBlank()) {
                explanationJson = meta.toString();
            }
            ranked.add(new RankedRecommendation(id, score, explanationJson));
        }
        return ranked;
    }

    private void clearRecommendationSet(String zsetKey, java.util.function.Function<String, String> metaKeyResolver) {
        Response members = redisSupport.run(api -> api.zrange(List.of(zsetKey, "0", "-1"))).orElse(null);
        Set<String> keysToDelete = new HashSet<>();
        keysToDelete.add(zsetKey);
        if (members != null) {
            for (int i = 0; i < members.size(); i++) {
                keysToDelete.add(metaKeyResolver.apply(members.get(i).toString()));
            }
        }
        redisSupport.run(api -> api.del(new ArrayList<>(keysToDelete)));
    }

    private void expire(String key) {
        long ttlSeconds = BASE_TTL.plusSeconds(ThreadLocalRandom.current()
                        .nextLong(JITTER_MAX.getSeconds() + 1))
                .getSeconds();
        redisSupport.run(api -> api.expire(List.of(key, String.valueOf(ttlSeconds))));
    }

    private long parseLong(Response response) {
        try {
            return Long.parseLong(response.toString());
        } catch (Exception e) {
            Log.debug("Failed to parse Redis numeric response", e);
            return 0L;
        }
    }

    private String userRecoKey(UUID userId) {
        return "reco:user:%s:users".formatted(userId);
    }

    private String communityRecoKey(UUID userId) {
        return "reco:user:%s:communities".formatted(userId);
    }

    private String userMetaKey(UUID userId, String candidateId) {
        return "reco:user:%s:usermeta:%s".formatted(userId, candidateId);
    }

    private String communityMetaKey(UUID userId, String communityId) {
        return "reco:user:%s:communitymeta:%s".formatted(userId, communityId);
    }

    private String nonBlankJson(String json) {
        if (json == null || json.isBlank()) {
            return "{}";
        }
        return json;
    }

    public record RankedRecommendation(UUID id, double score, String explanationJson) {
    }
}
