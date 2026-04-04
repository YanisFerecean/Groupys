package com.groupys.config;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

@ApplicationScoped
public class PerformanceFeatureFlags {

    @ConfigProperty(name = "performance.redis.enabled", defaultValue = "false")
    boolean redisEnabled;

    @ConfigProperty(name = "performance.redis.recommendation.read-enabled", defaultValue = "false")
    boolean redisRecommendationReadEnabled;

    @ConfigProperty(name = "performance.redis.recommendation.write-enabled", defaultValue = "false")
    boolean redisRecommendationWriteEnabled;

    @ConfigProperty(name = "performance.redis.recommendation.legacy-postgres-write-enabled", defaultValue = "true")
    boolean redisRecommendationLegacyPostgresWriteEnabled;

    @ConfigProperty(name = "performance.redis.chat-rate-limit-enabled", defaultValue = "false")
    boolean redisChatRateLimitEnabled;

    @ConfigProperty(name = "performance.redis.unread-counters-enabled", defaultValue = "false")
    boolean redisUnreadCountersEnabled;

    @ConfigProperty(name = "performance.redis.readiness.strict-enabled", defaultValue = "false")
    boolean redisReadinessStrictEnabled;

    @ConfigProperty(name = "performance.vector.bootstrap-enabled", defaultValue = "true")
    boolean vectorBootstrapEnabled;

    @ConfigProperty(name = "performance.schema.bootstrap-enabled", defaultValue = "true")
    boolean schemaBootstrapEnabled;

    @ConfigProperty(name = "performance.vector.read-enabled", defaultValue = "false")
    boolean vectorReadEnabled;

    @ConfigProperty(name = "performance.vector.candidate-top-k", defaultValue = "500")
    int vectorCandidateTopK;

    @ConfigProperty(name = "performance.vector.embedding-dimension", defaultValue = "768")
    int vectorEmbeddingDimension;

    @ConfigProperty(name = "performance.snapshot.blob.read-enabled", defaultValue = "false")
    boolean snapshotBlobReadEnabled;

    @ConfigProperty(name = "performance.snapshot.blob.write-enabled", defaultValue = "false")
    boolean snapshotBlobWriteEnabled;

    @ConfigProperty(name = "performance.snapshot.payload-json-write-enabled", defaultValue = "true")
    boolean snapshotPayloadJsonWriteEnabled;

    @ConfigProperty(name = "performance.snapshot.bucket", defaultValue = "music-snapshots")
    String snapshotBucket;

    @ConfigProperty(name = "performance.read-model.read-enabled", defaultValue = "false")
    boolean readModelReadEnabled;

    @ConfigProperty(name = "performance.read-model.write-enabled", defaultValue = "false")
    boolean readModelWriteEnabled;

    public boolean redisEnabled() {
        return redisEnabled;
    }

    public boolean redisRecommendationReadEnabled() {
        return redisRecommendationReadEnabled;
    }

    public boolean redisRecommendationWriteEnabled() {
        return redisRecommendationWriteEnabled;
    }

    public boolean redisRecommendationLegacyPostgresWriteEnabled() {
        return redisRecommendationLegacyPostgresWriteEnabled;
    }

    public boolean redisChatRateLimitEnabled() {
        return redisChatRateLimitEnabled;
    }

    public boolean redisUnreadCountersEnabled() {
        return redisUnreadCountersEnabled;
    }

    public boolean redisReadinessStrictEnabled() {
        return redisReadinessStrictEnabled;
    }

    public boolean vectorBootstrapEnabled() {
        return vectorBootstrapEnabled;
    }

    public boolean schemaBootstrapEnabled() {
        return schemaBootstrapEnabled;
    }

    public boolean vectorReadEnabled() {
        return vectorReadEnabled;
    }

    public int vectorCandidateTopK() {
        return vectorCandidateTopK;
    }

    public int vectorEmbeddingDimension() {
        return vectorEmbeddingDimension;
    }

    public boolean snapshotBlobReadEnabled() {
        return snapshotBlobReadEnabled;
    }

    public boolean snapshotBlobWriteEnabled() {
        return snapshotBlobWriteEnabled;
    }

    public boolean snapshotPayloadJsonWriteEnabled() {
        return snapshotPayloadJsonWriteEnabled;
    }

    public String snapshotBucket() {
        return snapshotBucket;
    }

    public boolean readModelReadEnabled() {
        return readModelReadEnabled;
    }

    public boolean readModelWriteEnabled() {
        return readModelWriteEnabled;
    }
}
