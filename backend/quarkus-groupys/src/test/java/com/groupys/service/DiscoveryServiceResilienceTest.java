package com.groupys.service;

import com.groupys.config.PerformanceFeatureFlags;
import com.groupys.dto.SuggestedUserResDto;
import com.groupys.model.MusicSourceSnapshot;
import com.groupys.model.User;
import com.groupys.model.UserSimilarityCache;
import com.groupys.repository.ConversationRepository;
import com.groupys.repository.MusicSourceSnapshotRepository;
import com.groupys.repository.UserDiscoveryActionRepository;
import com.groupys.repository.UserFollowRepository;
import com.groupys.repository.UserLikeRepository;
import com.groupys.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class DiscoveryServiceResilienceTest {

    @Test
    void getSuggestedUsersFallsBackToComputedRecommendationsWhenRedisMissesAndLegacyWritesAreDisabled() {
        User requester = user("requester", "clerk-requester", "alex");
        User candidate = user("candidate", "clerk-candidate", "luna");

        RecordingDiscoveryService service = new RecordingDiscoveryService();
        service.flags = new StubFlags(true, true, false, false, true, false, "music-snapshots");
        service.userRepository = new StubUserRepository(Map.of(requester.clerkId, requester), Map.of(candidate.id, candidate));
        service.redisCacheService = new StubDiscoveryRedisCacheService(List.of());
        service.userFollowRepository = new EmptyUserFollowRepository();
        service.conversationRepository = new EmptyConversationRepository();
        service.userDiscoveryActionRepository = new EmptyUserDiscoveryActionRepository();
        service.userLikeRepository = new EmptyUserLikeRepository();
        service.computedUserCaches = List.of(userCache(requester, candidate, 0.83d));

        List<SuggestedUserResDto> result = service.getSuggestedUsers(requester.clerkId, 10, false);

        assertEquals(1, result.size());
        assertEquals(candidate.id, result.getFirst().userId());
        assertEquals(1, service.computeUserCalls);
    }

    @Test
    void getSuggestedUsersShortCircuitsOnRedisHitWithoutComputing() {
        User requester = user("requester-hit", "clerk-requester-hit", "alex");
        User candidate = user("candidate-hit", "clerk-candidate-hit", "luna");

        RecordingDiscoveryService service = new RecordingDiscoveryService();
        service.flags = new StubFlags(true, true, false, false, true, false, "music-snapshots");
        service.userRepository = new StubUserRepository(Map.of(requester.clerkId, requester), Map.of(candidate.id, candidate));
        service.redisCacheService = new StubDiscoveryRedisCacheService(List.of(
                new DiscoveryRedisCacheService.RankedRecommendation(candidate.id, 0.91d, explanationJson())
        ));
        service.userFollowRepository = new EmptyUserFollowRepository();
        service.conversationRepository = new EmptyConversationRepository();
        service.userDiscoveryActionRepository = new EmptyUserDiscoveryActionRepository();
        service.userLikeRepository = new EmptyUserLikeRepository();
        service.computedUserCaches = List.of(userCache(requester, candidate, 0.50d));

        List<SuggestedUserResDto> result = service.getSuggestedUsers(requester.clerkId, 10, false);

        assertEquals(1, result.size());
        assertEquals(candidate.id, result.getFirst().userId());
        assertEquals(0, service.computeUserCalls);
    }

    @Test
    void persistSnapshotWritesPayloadJsonWhenBlobUploadFails() {
        DiscoveryService service = new DiscoveryService();
        service.flags = new StubFlags(false, false, true, false, false, true, "music-snapshots");
        service.storageService = new FailingPutStorageService();
        CapturingMusicSourceSnapshotRepository repository = new CapturingMusicSourceSnapshotRepository();
        service.musicSourceSnapshotRepository = repository;

        User user = user("snapshot-failure", "clerk-snapshot-failure", "alex");
        String payload = "{\"tracks\":[1,2,3]}";
        MusicSourceSnapshot persisted = service.persistSnapshot(user, "SPOTIFY_TOP_TRACKS", "TOP_TRACKS", payload, "PROCESSED", null);

        assertEquals(payload, persisted.payloadJson);
        assertEquals(payload, repository.persisted.payloadJson);
        assertNull(persisted.objectKey);
    }

    @Test
    void resolveSnapshotPayloadForProcessingUsesBlobPayloadWhenIntegrityChecksPass() {
        DiscoveryService service = new DiscoveryService();
        service.flags = new StubFlags(false, false, true, true, false, false, "music-snapshots");

        String blobPayload = "{\"artists\":[\"A\"]}";
        byte[] bytes = blobPayload.getBytes(StandardCharsets.UTF_8);
        service.storageService = new StaticReadStorageService(bytes);

        MusicSourceSnapshot snapshot = new MusicSourceSnapshot();
        snapshot.id = UUID.nameUUIDFromBytes("snapshot-valid".getBytes(StandardCharsets.UTF_8));
        snapshot.objectKey = "u1/source/type/2026/03/snapshot.json";
        snapshot.payloadSizeBytes = (long) bytes.length;
        snapshot.checksum = sha256Hex(bytes);
        snapshot.payloadJson = "{\"artists\":[\"fallback\"]}";

        String resolved = service.resolveSnapshotPayloadForProcessing(snapshot, "{\"artists\":[\"memory\"]}");

        assertEquals(blobPayload, resolved);
    }

    @Test
    void resolveSnapshotPayloadForProcessingFallsBackToPayloadJsonWhenBlobIntegrityFails() {
        DiscoveryService service = new DiscoveryService();
        service.flags = new StubFlags(false, false, true, true, false, false, "music-snapshots");

        byte[] corruptedBytes = "{\"artists\":[\"broken\"]}".getBytes(StandardCharsets.UTF_8);
        service.storageService = new StaticReadStorageService(corruptedBytes);

        MusicSourceSnapshot snapshot = new MusicSourceSnapshot();
        snapshot.id = UUID.nameUUIDFromBytes("snapshot-invalid".getBytes(StandardCharsets.UTF_8));
        snapshot.objectKey = "u1/source/type/2026/03/snapshot.json";
        snapshot.payloadSizeBytes = (long) corruptedBytes.length;
        snapshot.checksum = "deadbeef";
        snapshot.payloadJson = "{\"artists\":[\"fallback\"]}";

        String resolved = service.resolveSnapshotPayloadForProcessing(snapshot, "{\"artists\":[\"memory\"]}");

        assertEquals("{\"artists\":[\"fallback\"]}", resolved);
    }

    private static User user(String seed, String clerkId, String username) {
        User user = new User();
        user.id = UUID.nameUUIDFromBytes(seed.getBytes(StandardCharsets.UTF_8));
        user.clerkId = clerkId;
        user.username = username;
        user.displayName = username;
        return user;
    }

    private static UserSimilarityCache userCache(User requester, User candidate, double score) {
        UserSimilarityCache cache = new UserSimilarityCache();
        cache.user = requester;
        cache.candidateUser = candidate;
        cache.score = score;
        cache.explanationJson = explanationJson();
        return cache;
    }

    private static String explanationJson() {
        return """
                {
                  "explanation": "Recommended from your taste and community activity",
                  "reasonCodes": ["SHARED_TOP_ARTISTS"],
                  "matchedArtists": ["Aurora"],
                  "matchedGenres": ["indie"],
                  "sharedCommunityCount": 1,
                  "countryMatch": false,
                  "mutualFollowCount": 0
                }
                """;
    }

    private static String sha256Hex(byte[] payload) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(payload);
            StringBuilder builder = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                builder.append(String.format("%02x", b));
            }
            return builder.toString();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static final class StubFlags extends PerformanceFeatureFlags {
        private final boolean redisEnabled;
        private final boolean redisReadEnabled;
        private final boolean legacyPostgresWritesEnabled;
        private final boolean snapshotBlobReadEnabled;
        private final boolean snapshotPayloadJsonWriteEnabled;
        private final boolean snapshotBlobWriteEnabled;
        private final String snapshotBucket;

        private StubFlags(boolean redisEnabled,
                          boolean redisReadEnabled,
                          boolean legacyPostgresWritesEnabled,
                          boolean snapshotBlobReadEnabled,
                          boolean snapshotPayloadJsonWriteEnabled,
                          boolean snapshotBlobWriteEnabled,
                          String snapshotBucket) {
            this.redisEnabled = redisEnabled;
            this.redisReadEnabled = redisReadEnabled;
            this.legacyPostgresWritesEnabled = legacyPostgresWritesEnabled;
            this.snapshotBlobReadEnabled = snapshotBlobReadEnabled;
            this.snapshotPayloadJsonWriteEnabled = snapshotPayloadJsonWriteEnabled;
            this.snapshotBlobWriteEnabled = snapshotBlobWriteEnabled;
            this.snapshotBucket = snapshotBucket;
        }

        @Override
        public boolean redisEnabled() {
            return redisEnabled;
        }

        @Override
        public boolean redisRecommendationReadEnabled() {
            return redisReadEnabled;
        }

        @Override
        public boolean redisRecommendationLegacyPostgresWriteEnabled() {
            return legacyPostgresWritesEnabled;
        }

        @Override
        public boolean snapshotBlobReadEnabled() {
            return snapshotBlobReadEnabled;
        }

        @Override
        public boolean snapshotPayloadJsonWriteEnabled() {
            return snapshotPayloadJsonWriteEnabled;
        }

        @Override
        public boolean snapshotBlobWriteEnabled() {
            return snapshotBlobWriteEnabled;
        }

        @Override
        public String snapshotBucket() {
            return snapshotBucket;
        }
    }

    private static final class RecordingDiscoveryService extends DiscoveryService {
        private int computeUserCalls;
        private List<UserSimilarityCache> computedUserCaches = List.of();

        @Override
        List<UserSimilarityCache> computeUserSimilarityCaches(UUID userId) {
            computeUserCalls++;
            return computedUserCaches;
        }
    }

    private static final class StubUserRepository extends UserRepository {
        private final Map<String, User> usersByClerkId;
        private final Map<UUID, User> usersById;

        private StubUserRepository(Map<String, User> usersByClerkId, Map<UUID, User> usersById) {
            this.usersByClerkId = usersByClerkId;
            this.usersById = usersById;
        }

        @Override
        public Optional<User> findByClerkId(String clerkId) {
            return Optional.ofNullable(usersByClerkId.get(clerkId));
        }

        @Override
        public Map<UUID, User> findByIdsMap(List<UUID> userIds) {
            Map<UUID, User> result = new HashMap<>();
            for (UUID userId : userIds) {
                User user = usersById.get(userId);
                if (user != null) {
                    result.put(userId, user);
                }
            }
            return result;
        }
    }

    private static final class StubDiscoveryRedisCacheService extends DiscoveryRedisCacheService {
        private final List<RankedRecommendation> userRecommendations;

        private StubDiscoveryRedisCacheService(List<RankedRecommendation> userRecommendations) {
            this.userRecommendations = userRecommendations;
        }

        @Override
        public List<RankedRecommendation> readUserRecommendations(UUID userId, int limit) {
            return userRecommendations.stream().limit(Math.max(0, limit)).toList();
        }
    }

    private static final class EmptyUserFollowRepository extends UserFollowRepository {
        @Override
        public List<com.groupys.model.UserFollow> findActiveByFollower(UUID followerUserId) {
            return List.of();
        }
    }

    private static final class EmptyConversationRepository extends ConversationRepository {
        @Override
        public List<UUID> findDirectConversationPartnerIds(UUID userId) {
            return List.of();
        }
    }

    private static final class EmptyUserDiscoveryActionRepository extends UserDiscoveryActionRepository {
        @Override
        public Set<UUID> findSuppressedUserIds(UUID userId) {
            return Set.of();
        }
    }

    private static final class EmptyUserLikeRepository extends UserLikeRepository {
        @Override
        public Set<UUID> findLikedUserIds(UUID fromUserId) {
            return Set.of();
        }
    }

    private static final class CapturingMusicSourceSnapshotRepository extends MusicSourceSnapshotRepository {
        private MusicSourceSnapshot persisted;

        @Override
        public void persist(MusicSourceSnapshot entity) {
            persisted = entity;
        }
    }

    private static final class FailingPutStorageService extends StorageService {
        @Override
        public void putObject(String bucket, String objectKey, String contentType, InputStream data, long size) {
            throw new RuntimeException("simulated MinIO failure");
        }
    }

    private static final class StaticReadStorageService extends StorageService {
        private final byte[] payload;

        private StaticReadStorageService(byte[] payload) {
            this.payload = payload;
        }

        @Override
        public InputStream getObject(String bucket, String objectKey) {
            return new ByteArrayInputStream(payload);
        }
    }
}
