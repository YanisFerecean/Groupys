package com.groupys.service;

import com.groupys.config.PerformanceFeatureFlags;
import com.groupys.repository.CommunityRecommendationCacheRepository;
import com.groupys.repository.UserRepository;
import com.groupys.repository.UserSimilarityCacheRepository;
import io.quarkus.logging.Log;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.UUID;

@ApplicationScoped
public class DiscoveryRedisWarmupJob {

    @Inject
    PerformanceFeatureFlags flags;

    @Inject
    UserRepository userRepository;

    @Inject
    UserSimilarityCacheRepository userSimilarityCacheRepository;

    @Inject
    CommunityRecommendationCacheRepository communityRecommendationCacheRepository;

    @Inject
    DiscoveryRedisCacheService redisCacheService;

    @Scheduled(every = "{discovery.redis.warmup.every:30m}", delayed = "{discovery.redis.warmup.initial-delay:90s}")
    void warmup() {
        if (!flags.redisEnabled() || !flags.redisRecommendationWriteEnabled()) {
            return;
        }
        for (UUID userId : userRepository.listActiveDiscoveryUserIds()) {
            try {
                if (!redisCacheService.hasUserRecommendations(userId)) {
                    redisCacheService.writeUserRecommendations(userId, userSimilarityCacheRepository.findFreshByUser(userId, 100));
                }
                if (!redisCacheService.hasCommunityRecommendations(userId)) {
                    redisCacheService.writeCommunityRecommendations(userId, communityRecommendationCacheRepository.findFreshByUser(userId, 100));
                }
            } catch (Exception e) {
                Log.debugf(e, "Redis warmup failed for discovery user %s", userId);
            }
        }
    }
}
