package com.groupys.service;

import com.groupys.config.PerformanceFeatureFlags;
import com.groupys.model.User;
import com.groupys.model.UserArtistPreference;
import com.groupys.model.UserFollow;
import com.groupys.model.UserGenrePreference;
import com.groupys.model.UserSimilarityCache;
import com.groupys.model.UserTasteProfile;
import com.groupys.repository.CommunityMemberRepository;
import com.groupys.repository.ConversationRepository;
import com.groupys.repository.FriendshipRepository;
import com.groupys.repository.ArtistRepository;
import com.groupys.repository.GenreRepository;
import com.groupys.repository.UserArtistPreferenceRepository;
import com.groupys.repository.UserDiscoveryActionRepository;
import com.groupys.repository.UserFollowRepository;
import com.groupys.repository.UserGenrePreferenceRepository;
import com.groupys.repository.UserLikeRepository;
import com.groupys.repository.UserRepository;
import com.groupys.repository.UserTasteProfileRepository;
import com.groupys.model.Artist;
import com.groupys.model.Genre;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Unit tests for user-similarity scoring in {@link DiscoveryService#computeUserSimilarityCaches}.
 * Focuses on the friends-of-friends signal and its interaction with other factors.
 */
class UserSimilarityTest {

    // ── Tests ───────────────────────────────────────────────────────────────

    @Test
    void friendsOfFriendsBoostsRankingOverBetterArtistOverlapCandidate() {
        User user = user("user-fof", "clerk-fof", "alice", null);
        UUID sf1 = UUID.nameUUIDFromBytes("shared-friend-1".getBytes(StandardCharsets.UTF_8));
        UUID sf2 = UUID.nameUUIDFromBytes("shared-friend-2".getBytes(StandardCharsets.UTF_8));
        UUID sf3 = UUID.nameUUIDFromBytes("shared-friend-3".getBytes(StandardCharsets.UTF_8));

        // candidateA: slightly lower artist overlap (0.5) but shares 3 friends with user
        User candidateA = user("candidate-a", "clerk-a", "bob", null);
        // candidateB: higher artist overlap (0.6) but no shared friends
        User candidateB = user("candidate-b", "clerk-b", "carol", null);

        Artist artistA = artist(101L, "Bicep");
        Artist artistB = artist(102L, "Four Tet");

        UserArtistPreference userPrefA = artistPref(user, artistA, 0.5d);  // user likes artistA at 0.5
        UserArtistPreference candidateAPref = artistPref(candidateA, artistA, 1.0d);  // candidateA has artistA — overlap = 0.5
        UserArtistPreference candidateBPref = artistPref(candidateB, artistB, 1.0d);  // candidateB has different artist

        // Give user a strong preference for artistA (0.5) and candidateB also has their own artist
        UserArtistPreference userPrefB = artistPref(user, artistB, 0.6d);  // user likes artistB at 0.6 → candidateB overlap = 0.6

        DiscoveryService service = minimalService(
                user,
                List.of(candidateA, candidateB),
                Map.of(
                        user.id, List.of(userPrefA, userPrefB),
                        candidateA.id, List.of(candidateAPref),
                        candidateB.id, List.of(candidateBPref)
                )
        );
        // user shares 3 friends with candidateA → fof = 3/5 = 0.6; candidateB has no shared friends
        service.friendshipRepository = new StubFriendshipRepository(Map.of(
                user.id, Set.of(sf1, sf2, sf3),
                candidateA.id, Set.of(sf1, sf2, sf3)
                // candidateB has no friends in common with user
        ));

        List<UserSimilarityCache> result = service.computeUserSimilarityCaches(user.id);

        assertFalse(result.isEmpty(), "Expected at least one result");
        assertEquals(2, result.size(), "Both candidates should exceed the 0.05 threshold");
        assertEquals(candidateA.id, result.getFirst().candidateUser.id,
                "candidateA (friends bonus) must rank above candidateB (better artist overlap only)");
    }

    @Test
    void friendsOfFriendsReasonCodeAppearsInExplanationJson() {
        User user = user("user-reason", "clerk-reason", "dave", null);
        UUID friend1 = UUID.nameUUIDFromBytes("friend-1".getBytes(StandardCharsets.UTF_8));
        UUID friend2 = UUID.nameUUIDFromBytes("friend-2".getBytes(StandardCharsets.UTF_8));
        User candidate = user("candidate-reason", "clerk-candidate-reason", "eve", null);

        Artist sharedArtist = artist(200L, "Burial");
        UserArtistPreference userPref = artistPref(user, sharedArtist, 1.0d);
        UserArtistPreference candidatePref = artistPref(candidate, sharedArtist, 1.0d);

        DiscoveryService service = minimalService(
                user,
                List.of(candidate),
                Map.of(
                        user.id, List.of(userPref),
                        candidate.id, List.of(candidatePref)
                )
        );
        service.friendshipRepository = new StubFriendshipRepository(Map.of(
                user.id, Set.of(friend1, friend2),
                candidate.id, Set.of(friend1, friend2)
        ));

        List<UserSimilarityCache> result = service.computeUserSimilarityCaches(user.id);

        assertEquals(1, result.size());
        UserSimilarityCache cache = result.getFirst();
        assertTrue(cache.explanationJson.contains("FRIENDS_OF_FRIENDS"),
                "explanationJson must contain FRIENDS_OF_FRIENDS reason code");
        assertTrue(cache.friendsOfFriendsScore > 0,
                "friendsOfFriendsScore must be positive when shared friends exist");
    }

    @Test
    void noSharedFriendsYieldsZeroFriendsScore() {
        User user = user("user-nof", "clerk-nof", "frank", null);
        User candidate = user("candidate-nof", "clerk-cnof", "grace", null);

        Artist sharedArtist = artist(300L, "Overmono");
        UserArtistPreference userPref = artistPref(user, sharedArtist, 1.0d);
        UserArtistPreference candidatePref = artistPref(candidate, sharedArtist, 1.0d);

        DiscoveryService service = minimalService(
                user,
                List.of(candidate),
                Map.of(
                        user.id, List.of(userPref),
                        candidate.id, List.of(candidatePref)
                )
        );
        // Disjoint friend sets — no intersection
        service.friendshipRepository = new StubFriendshipRepository(Map.of(
                user.id, Set.of(UUID.nameUUIDFromBytes("user-friend".getBytes(StandardCharsets.UTF_8))),
                candidate.id, Set.of(UUID.nameUUIDFromBytes("candidate-friend".getBytes(StandardCharsets.UTF_8)))
        ));

        List<UserSimilarityCache> result = service.computeUserSimilarityCaches(user.id);

        assertEquals(1, result.size());
        assertEquals(0.0d, result.getFirst().friendsOfFriendsScore, 0.0001d,
                "friendsOfFriendsScore must be 0 when friend sets are disjoint");
    }

    @Test
    void allFactorsContributeToFinalScore() {
        // artist overlap = 1.0 (same artist, same weight)
        // genre overlap = 0 (no genres for simplicity)
        // sharedCommunity = 0
        // activityScore = 1 - |0 - 0| = 1.0
        // countryScore = 1.0 (same country)
        // followGraphScore = 0
        // friendsOfFriends = 3/5 = 0.6
        // expected = 0.28*1 + 0.18*0 + 0.18*0 + 0.13*1 + 0.05*1 + 0.03*0 + 0.10*0.6
        //          = 0.28 + 0.13 + 0.05 + 0.06 = 0.52
        User user = user("user-all", "clerk-all", "henry", "FR");
        User candidate = user("candidate-all", "clerk-call", "iris", "FR");
        UUID f1 = UUID.nameUUIDFromBytes("f1".getBytes(StandardCharsets.UTF_8));
        UUID f2 = UUID.nameUUIDFromBytes("f2".getBytes(StandardCharsets.UTF_8));
        UUID f3 = UUID.nameUUIDFromBytes("f3".getBytes(StandardCharsets.UTF_8));

        Artist sharedArtist = artist(400L, "Fred again..");
        UserArtistPreference userPref = artistPref(user, sharedArtist, 1.0d);
        UserArtistPreference candidatePref = artistPref(candidate, sharedArtist, 1.0d);

        DiscoveryService service = minimalService(
                user,
                List.of(candidate),
                Map.of(
                        user.id, List.of(userPref),
                        candidate.id, List.of(candidatePref)
                )
        );
        service.friendshipRepository = new StubFriendshipRepository(Map.of(
                user.id, Set.of(f1, f2, f3),
                candidate.id, Set.of(f1, f2, f3)
        ));

        List<UserSimilarityCache> result = service.computeUserSimilarityCaches(user.id);

        assertEquals(1, result.size());
        UserSimilarityCache cache = result.getFirst();
        assertEquals(0.52d, cache.score, 0.001d,
                "Final score must match 0.28*artist + 0.13*activity + 0.05*country + 0.10*fof");
        assertEquals(1.0d, cache.artistOverlapScore, 0.0001d);
        assertEquals(0.6d, cache.friendsOfFriendsScore, 0.0001d);
        assertEquals(1.0d, cache.countryScore, 0.0001d);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static User user(String seed, String clerkId, String username, String countryCode) {
        User user = new User();
        user.id = UUID.nameUUIDFromBytes(seed.getBytes(StandardCharsets.UTF_8));
        user.clerkId = clerkId;
        user.username = username;
        user.displayName = username;
        user.countryCode = countryCode;
        return user;
    }

    private static Artist artist(long id, String name) {
        Artist a = new Artist();
        a.setId(id);
        a.setName(name);
        return a;
    }

    private static UserArtistPreference artistPref(User user, Artist artist, double score) {
        UserArtistPreference pref = new UserArtistPreference();
        pref.id = UUID.nameUUIDFromBytes(("up-" + user.id + "-" + artist.getId()).getBytes(StandardCharsets.UTF_8));
        pref.user = user;
        pref.artist = artist;
        pref.normalizedScore = score;
        return pref;
    }

    /**
     * Builds a DiscoveryService wired with the minimal stubs needed to call
     * {@code computeUserSimilarityCaches}. The {@code friendshipRepository} defaults
     * to an empty StubFriendshipRepository that can be overridden per-test.
     */
    private static TestDiscoveryService minimalService(
            User user,
            List<User> candidates,
            Map<UUID, List<UserArtistPreference>> artistPrefs
    ) {
        TestDiscoveryService service = new TestDiscoveryService();
        service.flags = allFeaturesOff();
        service.userRepository = new StubUserRepository(user, candidates);
        service.userArtistPreferenceRepository = new MultiUserArtistPreferenceRepository(artistPrefs);
        service.userGenrePreferenceRepository = new EmptyUserGenrePreferenceRepository();
        service.userFollowRepository = new EmptyUserFollowRepository();
        service.conversationRepository = new EmptyConversationRepository();
        service.userDiscoveryActionRepository = new EmptyUserDiscoveryActionRepository();
        service.userLikeRepository = new EmptyUserLikeRepository();
        service.friendshipRepository = new StubFriendshipRepository(Map.of());
        service.communityMemberRepository = new EmptyUserCommunityMemberRepository();
        service.userTasteProfileRepository = new StubUserTasteProfileRepository();
        service.artistRepository = new EmptyArtistRepository();
        service.genreRepository = new EmptyGenreRepository();
        return service;
    }

    private static PerformanceFeatureFlags allFeaturesOff() {
        return new StubFlags();
    }

    // ── Test service subclass ────────────────────────────────────────────────

    /**
     * Overrides the two private-but-complex methods that call many repositories
     * unrelated to the user-similarity scoring under test.
     */
    private static final class TestDiscoveryService extends DiscoveryService {
        @Override
        void rebuildCommunityDerivedPreferences(User user) {
            // no-op — avoids Panache delete/persist calls in unit tests
        }

        @Override
        void refreshUserTasteProfile(User user) {
            // no-op — profile is provided by StubUserTasteProfileRepository
        }

        @Override
        public void refreshForUser(UUID userId) {
            // no-op — prevent full refresh cascade
        }
    }

    // ── Stubs ────────────────────────────────────────────────────────────────

    private static final class StubFlags extends PerformanceFeatureFlags {
        @Override public boolean redisEnabled() { return false; }
        @Override public boolean redisRecommendationReadEnabled() { return false; }
        @Override public boolean redisRecommendationWriteEnabled() { return false; }
        @Override public boolean redisRecommendationLegacyPostgresWriteEnabled() { return false; }
        @Override public boolean vectorReadEnabled() { return false; }
        @Override public boolean vectorBootstrapEnabled() { return false; }
        @Override public boolean snapshotBlobReadEnabled() { return false; }
        @Override public boolean snapshotBlobWriteEnabled() { return false; }
        @Override public boolean snapshotPayloadJsonWriteEnabled() { return false; }
        @Override public String snapshotBucket() { return "test-bucket"; }
    }

    private static final class StubUserRepository extends UserRepository {
        private final User user;
        private final List<User> candidates;

        StubUserRepository(User user, List<User> candidates) {
            this.user = user;
            this.candidates = candidates;
        }

        @Override
        public Optional<User> findByClerkId(String clerkId) {
            if (clerkId.equals(user.clerkId)) return Optional.of(user);
            return candidates.stream().filter(c -> clerkId.equals(c.clerkId)).findFirst();
        }

        @Override
        public Optional<User> findByIdOptional(UUID id) {
            if (id.equals(user.id)) return Optional.of(user);
            return candidates.stream().filter(c -> id.equals(c.id)).findFirst();
        }

        @Override
        public List<User> listDiscoveryVisible(UUID excludeUserId) {
            return candidates;
        }
    }

    private static final class MultiUserArtistPreferenceRepository extends UserArtistPreferenceRepository {
        private final Map<UUID, List<UserArtistPreference>> prefsByUser;

        MultiUserArtistPreferenceRepository(Map<UUID, List<UserArtistPreference>> prefsByUser) {
            this.prefsByUser = prefsByUser;
        }

        @Override
        public List<UserArtistPreference> findByUser(UUID userId) {
            return prefsByUser.getOrDefault(userId, List.of());
        }
    }

    private static final class EmptyUserGenrePreferenceRepository extends UserGenrePreferenceRepository {
        @Override
        public List<UserGenrePreference> findByUser(UUID userId) { return List.of(); }
    }

    private static final class EmptyUserFollowRepository extends UserFollowRepository {
        @Override
        public List<UserFollow> findActiveByFollower(UUID followerUserId) { return List.of(); }

        @Override
        public long countMutualFollowers(UUID userId, UUID candidateUserId) { return 0L; }
    }

    private static final class EmptyConversationRepository extends ConversationRepository {
        @Override
        public List<UUID> findDirectConversationPartnerIds(UUID userId) { return List.of(); }
    }

    private static final class EmptyUserDiscoveryActionRepository extends UserDiscoveryActionRepository {
        @Override
        public Set<UUID> findSuppressedUserIds(UUID userId) { return Set.of(); }

        @Override
        public Set<UUID> findSuppressedCommunityIds(UUID userId) { return Set.of(); }
    }

    private static final class EmptyUserLikeRepository extends UserLikeRepository {
        @Override
        public Set<UUID> findLikedUserIds(UUID fromUserId) { return Set.of(); }
    }

    private static final class StubFriendshipRepository extends FriendshipRepository {
        private final Map<UUID, Set<UUID>> friendsByUser;

        StubFriendshipRepository(Map<UUID, Set<UUID>> friendsByUser) {
            this.friendsByUser = friendsByUser;
        }

        @Override
        public Set<UUID> findAcceptedFriendIds(UUID userId) {
            return friendsByUser.getOrDefault(userId, Set.of());
        }
    }

    private static final class EmptyUserCommunityMemberRepository extends CommunityMemberRepository {
        @Override
        public List<com.groupys.model.CommunityMember> findByUser(UUID userId) { return List.of(); }

        @Override
        public long countSharedCommunities(UUID userId, UUID candidateUserId) { return 0L; }
    }

    /** Returns a pre-built profile with communityActivityScore=0 for any userId. */
    private static final class StubUserTasteProfileRepository extends UserTasteProfileRepository {
        @Override
        public Optional<UserTasteProfile> findByUserId(UUID userId) {
            UserTasteProfile profile = new UserTasteProfile();
            profile.id = UUID.nameUUIDFromBytes(("profile-" + userId).getBytes(StandardCharsets.UTF_8));
            profile.communityActivityScore = 0.0d;
            profile.musicActivityScore = 0.0d;
            return Optional.of(profile);
        }
    }

    /** Used by intersectArtistNames — returns empty for all IDs so no artist name resolution needed. */
    private static final class EmptyArtistRepository extends ArtistRepository {
        @Override
        public Optional<Artist> findByIdOptional(Long id) { return Optional.empty(); }
    }

    /** Used by intersectGenreNames — returns empty for all IDs. */
    private static final class EmptyGenreRepository extends GenreRepository {
        @Override
        public Optional<Genre> findByIdOptional(Long id) { return Optional.empty(); }

        @Override
        public Optional<Genre> findByNameIgnoreCase(String name) { return Optional.empty(); }
    }
}
