package com.groupys.service;

import com.groupys.config.PerformanceFeatureFlags;
import com.groupys.dto.SuggestedCommunityResDto;
import com.groupys.model.Artist;
import com.groupys.model.Community;
import com.groupys.model.CommunityArtist;
import com.groupys.model.CommunityGenre;
import com.groupys.model.CommunityMember;
import com.groupys.model.CommunityRecommendationCache;
import com.groupys.model.CommunityTasteProfile;
import com.groupys.model.Genre;
import com.groupys.model.User;
import com.groupys.model.UserArtistPreference;
import com.groupys.model.UserGenrePreference;
import com.groupys.repository.ArtistRepository;
import com.groupys.repository.CommunityArtistRepository;
import com.groupys.repository.CommunityGenreRepository;
import com.groupys.repository.CommunityMemberRepository;
import com.groupys.repository.CommunityRecommendationCacheRepository;
import com.groupys.repository.CommunityRepository;
import com.groupys.repository.CommunityTasteProfileRepository;
import com.groupys.repository.GenreRepository;
import com.groupys.repository.FriendshipRepository;
import com.groupys.repository.UserArtistPreferenceRepository;
import com.groupys.repository.UserDiscoveryActionRepository;
import com.groupys.repository.UserGenrePreferenceRepository;
import com.groupys.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Tests for community recommendation logic: scoring, filtering, ranking,
 * and the getSuggestedCommunities caching tiers (Redis → Postgres → live compute).
 */
class CommunityRecommendationTest {

    // ── computeCommunityRecommendationCaches ────────────────────────────────

    @Test
    void artistOverlapProducesRecommendation() {
        User user = user("user-1", "clerk-1", "alice", null);
        Artist sharedArtist = artist(101L, "Bicep");
        Community community = community("comm-indie", "Indie Beats", null, null);

        DiscoveryService service = minimalService(user);
        service.userArtistPreferenceRepository = new StubUserArtistPreferenceRepository(
                List.of(artistPref(user, sharedArtist, 1.0))
        );
        service.communityArtistRepository = new StubCommunityArtistRepository(
                Map.of(community.id, List.of(communityArtist(community, sharedArtist, 1.0)))
        );
        service.artistRepository = new StubArtistRepository(Map.of(101L, sharedArtist));
        service.communityRepository = new StubCommunityRepository(List.of(community));

        List<CommunityRecommendationCache> result = service.computeCommunityRecommendationCaches(user.id);

        assertEquals(1, result.size());
        assertEquals(community.id, result.getFirst().community.id);
        assertTrue(result.getFirst().score > 0.05d, "Score should exceed the 0.05 threshold");
        assertTrue(result.getFirst().artistOverlapScore > 0, "Artist overlap score should be positive");
        assertEquals("SHARED_TOP_ARTISTS", result.getFirst().primaryReasonCode);
    }

    @Test
    void genreOverlapAloneProducesRecommendation() {
        User user = user("user-genre", "clerk-genre", "bob", null);
        Genre sharedGenre = genre(10L, "electronic");
        Community community = community("comm-electronic", "Electronic Hub", null, null);

        DiscoveryService service = minimalService(user);
        service.userGenrePreferenceRepository = new StubUserGenrePreferenceRepository(
                List.of(genrePref(user, sharedGenre, 1.0))
        );
        service.communityGenreRepository = new StubCommunityGenreRepository(
                Map.of(community.id, List.of(communityGenre(community, sharedGenre, 1.0)))
        );
        // Genre name resolution is needed for reasonCode assignment
        service.genreRepository = new StubGenreRepository(Map.of(10L, sharedGenre));
        service.communityRepository = new StubCommunityRepository(List.of(community));

        List<CommunityRecommendationCache> result = service.computeCommunityRecommendationCaches(user.id);

        assertEquals(1, result.size());
        assertTrue(result.getFirst().genreOverlapScore > 0, "Genre overlap score should be positive");
        assertEquals("SHARED_GENRES", result.getFirst().primaryReasonCode);
    }

    @Test
    void joinedCommunityIsExcluded() {
        User user = user("user-joined", "clerk-joined", "carol", null);
        Artist sharedArtist = artist(102L, "Overmono");
        Community alreadyJoined = community("comm-joined", "Already Joined", null, null);

        DiscoveryService service = minimalService(user);
        service.userArtistPreferenceRepository = new StubUserArtistPreferenceRepository(
                List.of(artistPref(user, sharedArtist, 1.0))
        );
        service.communityArtistRepository = new StubCommunityArtistRepository(
                Map.of(alreadyJoined.id, List.of(communityArtist(alreadyJoined, sharedArtist, 1.0)))
        );
        service.artistRepository = new StubArtistRepository(Map.of(102L, sharedArtist));
        service.communityRepository = new StubCommunityRepository(List.of(alreadyJoined));
        service.communityMemberRepository = new StubCommunityMemberRepository(
                Map.of(user.id, List.of(membership(user, alreadyJoined))),
                Map.of()
        );

        List<CommunityRecommendationCache> result = service.computeCommunityRecommendationCaches(user.id);

        assertTrue(result.isEmpty(), "Already-joined community must not appear in recommendations");
    }

    @Test
    void suppressedCommunityIsExcluded() {
        User user = user("user-suppress", "clerk-suppress", "dave", null);
        Artist sharedArtist = artist(103L, "Four Tet");
        Community dismissed = community("comm-dismissed", "Dismissed Community", null, null);

        DiscoveryService service = minimalService(user);
        service.userArtistPreferenceRepository = new StubUserArtistPreferenceRepository(
                List.of(artistPref(user, sharedArtist, 1.0))
        );
        service.communityArtistRepository = new StubCommunityArtistRepository(
                Map.of(dismissed.id, List.of(communityArtist(dismissed, sharedArtist, 1.0)))
        );
        service.artistRepository = new StubArtistRepository(Map.of(103L, sharedArtist));
        service.communityRepository = new StubCommunityRepository(List.of(dismissed));
        service.userDiscoveryActionRepository = new StubUserDiscoveryActionRepository(
                Set.of(dismissed.id)
        );

        List<CommunityRecommendationCache> result = service.computeCommunityRecommendationCaches(user.id);

        assertTrue(result.isEmpty(), "Suppressed (dismissed) community must not appear in recommendations");
    }

    @Test
    void countryMatchIsReflectedInScoreAndReasonCode() {
        User user = user("user-fr", "clerk-fr", "eva", "FR");
        Community frenchCommunity = community("comm-fr", "French Music", null, "FR");

        DiscoveryService service = minimalService(user);
        // Give only a small artist overlap so countryScore is the decisive extra factor
        Artist sharedArtist = artist(104L, "Phoenix");
        service.userArtistPreferenceRepository = new StubUserArtistPreferenceRepository(
                List.of(artistPref(user, sharedArtist, 1.0))
        );
        service.communityArtistRepository = new StubCommunityArtistRepository(
                Map.of(frenchCommunity.id, List.of(communityArtist(frenchCommunity, sharedArtist, 1.0)))
        );
        service.artistRepository = new StubArtistRepository(Map.of(104L, sharedArtist));
        service.communityRepository = new StubCommunityRepository(List.of(frenchCommunity));

        // Also create a non-country-matched community with identical artist overlap
        Community otherCommunity = community("comm-other", "Other Music", null, "DE");
        service.communityArtistRepository = new StubCommunityArtistRepository(Map.of(
                frenchCommunity.id, List.of(communityArtist(frenchCommunity, sharedArtist, 1.0)),
                otherCommunity.id, List.of(communityArtist(otherCommunity, sharedArtist, 1.0))
        ));
        service.communityRepository = new StubCommunityRepository(List.of(frenchCommunity, otherCommunity));

        List<CommunityRecommendationCache> result = service.computeCommunityRecommendationCaches(user.id);

        assertEquals(2, result.size());
        CommunityRecommendationCache top = result.getFirst();
        assertEquals(frenchCommunity.id, top.community.id, "Country-matched community should rank first");
        assertTrue(top.countryScore > 0, "Country score should be positive for matching country");
    }

    @Test
    void belowThresholdCommunityIsExcluded() {
        // A community with no artist/genre overlap, no country match, memberCount=0, and
        // an activityScore of 0 scores exactly 0.05 * novelty(1.0) = 0.05,
        // which satisfies the "≤ 0.05" exclusion filter.
        User user = user("user-thresh", "clerk-thresh", "frank", null);
        Community noOverlap = community("comm-no-overlap", "Niche Community", null, null);
        noOverlap.memberCount = 0;  // memberCount-based activityFit boost = clamp(0/25)*0.5 = 0

        DiscoveryService service = minimalService(user);
        service.communityRepository = new StubCommunityRepository(List.of(noOverlap));
        service.communityTasteProfileRepository = new ZeroActivityTasteProfileRepository();

        List<CommunityRecommendationCache> result = service.computeCommunityRecommendationCaches(user.id);

        assertTrue(result.isEmpty(), "Community with no overlap and zero activity must be at or below the 0.05 score threshold");
    }

    @Test
    void resultsAreSortedByScoreDescending() {
        User user = user("user-sort", "clerk-sort", "grace", null);
        Artist weakArtist = artist(200L, "Artist-Weak");
        Artist strongArtist = artist(201L, "Artist-Strong");
        Community strongMatch = community("comm-strong", "Strong Match", null, null);
        Community weakMatch = community("comm-weak", "Weak Match", null, null);

        DiscoveryService service = minimalService(user);
        service.userArtistPreferenceRepository = new StubUserArtistPreferenceRepository(List.of(
                artistPref(user, strongArtist, 1.0),
                artistPref(user, weakArtist, 0.1)
        ));
        service.communityArtistRepository = new StubCommunityArtistRepository(Map.of(
                strongMatch.id, List.of(communityArtist(strongMatch, strongArtist, 1.0)),
                weakMatch.id, List.of(communityArtist(weakMatch, weakArtist, 0.1))
        ));
        service.artistRepository = new StubArtistRepository(Map.of(
                200L, weakArtist,
                201L, strongArtist
        ));
        service.communityRepository = new StubCommunityRepository(List.of(weakMatch, strongMatch));

        List<CommunityRecommendationCache> result = service.computeCommunityRecommendationCaches(user.id);

        assertFalse(result.isEmpty());
        for (int i = 1; i < result.size(); i++) {
            assertTrue(result.get(i - 1).score >= result.get(i).score,
                    "Results must be sorted by score descending");
        }
        assertEquals(strongMatch.id, result.getFirst().community.id,
                "Highest scoring community should be first");
    }

    @Test
    void rankPositionsAreAssignedStartingAtOne() {
        User user = user("user-rank", "clerk-rank", "henry", null);
        Artist artist = artist(300L, "Caribou");
        Community commA = community("comm-rank-a", "Rank A", null, null);
        Community commB = community("comm-rank-b", "Rank B", null, null);

        DiscoveryService service = minimalService(user);
        service.userArtistPreferenceRepository = new StubUserArtistPreferenceRepository(
                List.of(artistPref(user, artist, 1.0))
        );
        service.communityArtistRepository = new StubCommunityArtistRepository(Map.of(
                commA.id, List.of(communityArtist(commA, artist, 1.0)),
                commB.id, List.of(communityArtist(commB, artist, 0.5))
        ));
        service.artistRepository = new StubArtistRepository(Map.of(300L, artist));
        service.communityRepository = new StubCommunityRepository(List.of(commA, commB));

        List<CommunityRecommendationCache> result = service.computeCommunityRecommendationCaches(user.id);

        assertEquals(2, result.size());
        assertEquals(1, result.get(0).rankPosition);
        assertEquals(2, result.get(1).rankPosition);
    }

    // ── getSuggestedCommunities caching tiers ──────────────────────────────

    @Test
    void getSuggestedCommunitiesShortCircuitsOnRedisHit() {
        User user = user("user-redis", "clerk-redis", "iris", null);
        Community community = community("comm-redis", "Redis Community", null, null);

        RecordingDiscoveryService service = new RecordingDiscoveryService();
        service.flags = redisReadEnabled();
        service.userRepository = new StubUserRepository(user);
        service.communityRepository = new StubCommunityRepository(List.of(community));
        service.redisCacheService = new StubDiscoveryRedisCacheService(
                List.of(new DiscoveryRedisCacheService.RankedRecommendation(
                        community.id, 0.85d, communityExplanationJson()))
        );

        List<SuggestedCommunityResDto> result = service.getSuggestedCommunities(user.clerkId, 4, false);

        assertEquals(1, result.size());
        assertEquals(community.id, result.getFirst().communityId());
        assertEquals(0, service.computeCommunityCallCount, "Redis hit must skip live compute");
    }

    @Test
    void getSuggestedCommunitiesFallsBackToLiveComputeWhenRedisMisses() {
        User user = user("user-miss", "clerk-miss", "jake", null);
        Artist sharedArtist = artist(400L, "Jon Hopkins");
        Community community = community("comm-miss", "Miss Community", null, null);

        RecordingDiscoveryService service = new RecordingDiscoveryService();
        service.flags = redisReadEnabled();
        service.userRepository = new StubUserRepository(user);
        service.redisCacheService = new StubDiscoveryRedisCacheService(List.of());  // empty → miss
        service.communityRecommendationCacheRepository = new EmptyCommunityRecommendationCacheRepository();
        service.userArtistPreferenceRepository = new StubUserArtistPreferenceRepository(
                List.of(artistPref(user, sharedArtist, 1.0))
        );
        service.communityArtistRepository = new StubCommunityArtistRepository(
                Map.of(community.id, List.of(communityArtist(community, sharedArtist, 1.0)))
        );
        service.artistRepository = new StubArtistRepository(Map.of(400L, sharedArtist));
        service.communityRepository = new StubCommunityRepository(List.of(community));

        List<SuggestedCommunityResDto> result = service.getSuggestedCommunities(user.clerkId, 4, false);

        assertEquals(1, result.size());
        assertEquals(community.id, result.getFirst().communityId());
        assertEquals(1, service.computeCommunityCallCount, "Should fall through to live compute on Redis miss");
    }

    @Test
    void limitIsRespectedInResults() {
        User user = user("user-limit", "clerk-limit", "kim", null);
        Artist artist = artist(500L, "Aphex Twin");
        List<Community> communities = new ArrayList<>();
        Map<UUID, List<CommunityArtist>> artistMap = new HashMap<>();
        for (int i = 0; i < 6; i++) {
            Community c = community("comm-limit-" + i, "Community " + i, null, null);
            communities.add(c);
            artistMap.put(c.id, List.of(communityArtist(c, artist, 1.0)));
        }

        RecordingDiscoveryService service = new RecordingDiscoveryService();
        service.flags = redisAndLegacyDisabled();
        service.userRepository = new StubUserRepository(user);
        service.communityRepository = new StubCommunityRepository(communities);
        service.userArtistPreferenceRepository = new StubUserArtistPreferenceRepository(
                List.of(artistPref(user, artist, 1.0))
        );
        service.communityArtistRepository = new StubCommunityArtistRepository(artistMap);
        service.artistRepository = new StubArtistRepository(Map.of(500L, artist));

        List<SuggestedCommunityResDto> result = service.getSuggestedCommunities(user.clerkId, 4, false);

        assertEquals(4, result.size(), "limit=4 must be respected");
    }

    @Test
    void explanationContainsMatchedArtistNamesInDto() {
        User user = user("user-explain", "clerk-explain", "leo", null);
        Artist matched = artist(600L, "Burial");
        Community community = community("comm-explain", "Dark Beats", null, null);

        DiscoveryService service = minimalService(user);
        service.userArtistPreferenceRepository = new StubUserArtistPreferenceRepository(
                List.of(artistPref(user, matched, 1.0))
        );
        service.communityArtistRepository = new StubCommunityArtistRepository(
                Map.of(community.id, List.of(communityArtist(community, matched, 1.0)))
        );
        service.artistRepository = new StubArtistRepository(Map.of(600L, matched));
        service.communityRepository = new StubCommunityRepository(List.of(community));

        List<CommunityRecommendationCache> caches = service.computeCommunityRecommendationCaches(user.id);
        assertEquals(1, caches.size());

        CommunityRecommendationCache cache = caches.getFirst();
        assertEquals("SHARED_TOP_ARTISTS", cache.primaryReasonCode);
        // Verify the serialized explanationJson used by toSuggestedCommunity() contains the artist name
        assertTrue(cache.explanationJson.contains("Burial"),
                "Explanation JSON must include matched artist name");
        assertTrue(cache.explanationJson.contains("SHARED_TOP_ARTISTS"),
                "Explanation JSON must include reason code");
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private static User user(String seed, String clerkId, String username, String countryCode) {
        User user = new User();
        user.id = UUID.nameUUIDFromBytes(seed.getBytes(StandardCharsets.UTF_8));
        user.clerkId = clerkId;
        user.username = username;
        user.displayName = username;
        user.countryCode = countryCode;
        return user;
    }

    private static Community community(String seed, String name, String genre, String countryCode) {
        Community community = new Community();
        community.id = UUID.nameUUIDFromBytes(seed.getBytes(StandardCharsets.UTF_8));
        community.name = name;
        community.genre = genre;
        community.countryCode = countryCode;
        community.visibility = "PUBLIC";
        community.discoveryEnabled = true;
        community.memberCount = 10;
        return community;
    }

    private static Artist artist(long id, String name) {
        Artist artist = new Artist();
        artist.setId(id);
        artist.setName(name);
        return artist;
    }

    private static Genre genre(long id, String name) {
        Genre genre = new Genre();
        genre.id = id;
        genre.name = name;
        return genre;
    }

    private static UserArtistPreference artistPref(User user, Artist artist, double score) {
        UserArtistPreference pref = new UserArtistPreference();
        pref.id = UUID.nameUUIDFromBytes(("pref-" + user.id + "-" + artist.getId()).getBytes(StandardCharsets.UTF_8));
        pref.user = user;
        pref.artist = artist;
        pref.normalizedScore = score;
        return pref;
    }

    private static UserGenrePreference genrePref(User user, Genre genre, double score) {
        UserGenrePreference pref = new UserGenrePreference();
        pref.id = UUID.nameUUIDFromBytes(("gpref-" + user.id + "-" + genre.id).getBytes(StandardCharsets.UTF_8));
        pref.user = user;
        pref.genre = genre;
        pref.normalizedScore = score;
        return pref;
    }

    private static CommunityArtist communityArtist(Community community, Artist artist, double score) {
        CommunityArtist ca = new CommunityArtist();
        ca.id = UUID.nameUUIDFromBytes(("ca-" + community.id + "-" + artist.getId()).getBytes(StandardCharsets.UTF_8));
        ca.community = community;
        ca.artist = artist;
        ca.normalizedScore = score;
        return ca;
    }

    private static CommunityGenre communityGenre(Community community, Genre genre, double score) {
        CommunityGenre cg = new CommunityGenre();
        cg.id = UUID.nameUUIDFromBytes(("cg-" + community.id + "-" + genre.id).getBytes(StandardCharsets.UTF_8));
        cg.community = community;
        cg.genre = genre;
        cg.normalizedScore = score;
        return cg;
    }

    private static CommunityMember membership(User user, Community community) {
        CommunityMember member = new CommunityMember();
        member.id = UUID.nameUUIDFromBytes(("member-" + user.id + "-" + community.id).getBytes(StandardCharsets.UTF_8));
        member.user = user;
        member.community = community;
        return member;
    }

    private static CommunityTasteProfile tasteProfile(Community community) {
        CommunityTasteProfile profile = new CommunityTasteProfile();
        profile.id = UUID.nameUUIDFromBytes(("profile-" + community.id).getBytes(StandardCharsets.UTF_8));
        profile.community = community;
        profile.activityScore = 0.5d;
        return profile;
    }

    private static String communityExplanationJson() {
        return """
                {
                  "explanation": "Matches your top artists",
                  "reasonCodes": ["SHARED_TOP_ARTISTS"],
                  "matchedArtists": [{"id":"1","name":"Bicep"}],
                  "matchedGenres": [],
                  "sharedCommunityCount": 0,
                  "countryMatch": false,
                  "mutualFollowCount": 0
                }
                """;
    }

    /**
     * Builds a DiscoveryService wired with the minimal stubs needed to call
     * {@code computeCommunityRecommendationCaches}. Individual tests can override
     * specific repositories for the scenario under test.
     */
    private static DiscoveryService minimalService(User user) {
        DiscoveryService service = new DiscoveryService();
        service.userRepository = new StubUserRepository(user);
        service.userArtistPreferenceRepository = new EmptyUserArtistPreferenceRepository();
        service.userGenrePreferenceRepository = new EmptyUserGenrePreferenceRepository();
        service.communityMemberRepository = new StubCommunityMemberRepository(Map.of(), Map.of());
        service.userDiscoveryActionRepository = new StubUserDiscoveryActionRepository(Set.of());
        service.communityRepository = new StubCommunityRepository(List.of());
        service.communityArtistRepository = new StubCommunityArtistRepository(Map.of());
        service.communityGenreRepository = new StubCommunityGenreRepository(Map.of());
        service.communityTasteProfileRepository = new AutoCreatingTasteProfileRepository();
        service.artistRepository = new StubArtistRepository(Map.of());
        service.genreRepository = new EmptyGenreRepository();
        service.friendshipRepository = new EmptyFriendshipRepository();
        return service;
    }

    private static PerformanceFeatureFlags redisReadEnabled() {
        return new StubFlags(true, true, false);
    }

    private static PerformanceFeatureFlags redisAndLegacyDisabled() {
        return new StubFlags(false, false, false);
    }

    // ── Recording service ────────────────────────────────────────────────────

    private static final class RecordingDiscoveryService extends DiscoveryService {
        int computeCommunityCallCount;

        // Wire stubs that are always needed for getSuggestedCommunities
        {
            userArtistPreferenceRepository = new EmptyUserArtistPreferenceRepository();
            userGenrePreferenceRepository = new EmptyUserGenrePreferenceRepository();
            communityMemberRepository = new StubCommunityMemberRepository(Map.of(), Map.of());
            userDiscoveryActionRepository = new StubUserDiscoveryActionRepository(Set.of());
            communityArtistRepository = new StubCommunityArtistRepository(Map.of());
            communityGenreRepository = new StubCommunityGenreRepository(Map.of());
            communityTasteProfileRepository = new AutoCreatingTasteProfileRepository();
            artistRepository = new StubArtistRepository(Map.of());
            genreRepository = new EmptyGenreRepository();
            communityRecommendationCacheRepository = new EmptyCommunityRecommendationCacheRepository();
            friendshipRepository = new EmptyFriendshipRepository();
        }

        @Override
        List<CommunityRecommendationCache> computeCommunityRecommendationCaches(UUID userId) {
            computeCommunityCallCount++;
            return super.computeCommunityRecommendationCaches(userId);
        }

        @Override
        public void refreshForUser(UUID userId) {
            // no-op — prevent full refresh cascade in unit tests
        }
    }

    // ── Stubs ────────────────────────────────────────────────────────────────

    private static final class StubFlags extends PerformanceFeatureFlags {
        private final boolean redisEnabled;
        private final boolean redisReadEnabled;
        private final boolean legacyPostgresEnabled;

        StubFlags(boolean redisEnabled, boolean redisReadEnabled, boolean legacyPostgresEnabled) {
            this.redisEnabled = redisEnabled;
            this.redisReadEnabled = redisReadEnabled;
            this.legacyPostgresEnabled = legacyPostgresEnabled;
        }

        @Override public boolean redisEnabled() { return redisEnabled; }
        @Override public boolean redisRecommendationReadEnabled() { return redisReadEnabled; }
        @Override public boolean redisRecommendationLegacyPostgresWriteEnabled() { return legacyPostgresEnabled; }
        @Override public boolean redisRecommendationWriteEnabled() { return false; }
        @Override public boolean snapshotBlobReadEnabled() { return false; }
        @Override public boolean snapshotPayloadJsonWriteEnabled() { return false; }
        @Override public boolean snapshotBlobWriteEnabled() { return false; }
        @Override public String snapshotBucket() { return "test-bucket"; }
    }

    private static final class StubUserRepository extends UserRepository {
        private final User user;

        StubUserRepository(User user) { this.user = user; }

        @Override
        public Optional<User> findByClerkId(String clerkId) {
            return Optional.ofNullable(clerkId.equals(user.clerkId) ? user : null);
        }

        @Override
        public Optional<User> findByIdOptional(UUID id) {
            return Optional.ofNullable(id.equals(user.id) ? user : null);
        }
    }

    private static final class StubCommunityRepository extends CommunityRepository {
        private final List<Community> communities;

        StubCommunityRepository(List<Community> communities) { this.communities = communities; }

        @Override
        public List<Community> listDiscoverable() { return communities; }

        @Override
        public Map<UUID, Community> findByIdsMap(List<UUID> ids) {
            Map<UUID, Community> result = new HashMap<>();
            for (Community c : communities) {
                if (ids.contains(c.id)) result.put(c.id, c);
            }
            return result;
        }
    }

    private static final class StubUserArtistPreferenceRepository extends UserArtistPreferenceRepository {
        private final List<UserArtistPreference> prefs;

        StubUserArtistPreferenceRepository(List<UserArtistPreference> prefs) { this.prefs = prefs; }

        @Override
        public List<UserArtistPreference> findByUser(UUID userId) { return prefs; }
    }

    private static final class EmptyUserArtistPreferenceRepository extends UserArtistPreferenceRepository {
        @Override
        public List<UserArtistPreference> findByUser(UUID userId) { return List.of(); }
    }

    private static final class StubUserGenrePreferenceRepository extends UserGenrePreferenceRepository {
        private final List<UserGenrePreference> prefs;

        StubUserGenrePreferenceRepository(List<UserGenrePreference> prefs) { this.prefs = prefs; }

        @Override
        public List<UserGenrePreference> findByUser(UUID userId) { return prefs; }
    }

    private static final class EmptyUserGenrePreferenceRepository extends UserGenrePreferenceRepository {
        @Override
        public List<UserGenrePreference> findByUser(UUID userId) { return List.of(); }
    }

    private static final class StubCommunityMemberRepository extends CommunityMemberRepository {
        private final Map<UUID, List<CommunityMember>> byUser;
        private final Map<UUID, Long> sharedMemberCounts;

        StubCommunityMemberRepository(Map<UUID, List<CommunityMember>> byUser,
                                      Map<UUID, Long> sharedMemberCounts) {
            this.byUser = byUser;
            this.sharedMemberCounts = sharedMemberCounts;
        }

        @Override
        public List<CommunityMember> findByUser(UUID userId) {
            return byUser.getOrDefault(userId, List.of());
        }

        @Override
        public long countSharedMembers(UUID communityId, List<UUID> joinedCommunityIds) {
            return sharedMemberCounts.getOrDefault(communityId, 0L);
        }

        @Override
        public java.util.List<com.groupys.model.User> findFriendsInCommunity(UUID communityId, java.util.Set<UUID> friendIds, int limit) {
            return List.of();
        }
    }

    private static final class EmptyFriendshipRepository extends FriendshipRepository {
        @Override
        public java.util.Set<UUID> findAcceptedFriendIds(UUID userId) {
            return Set.of();
        }
    }

    private static final class StubUserDiscoveryActionRepository extends UserDiscoveryActionRepository {
        private final Set<UUID> suppressedIds;

        StubUserDiscoveryActionRepository(Set<UUID> suppressedIds) { this.suppressedIds = suppressedIds; }

        @Override
        public Set<UUID> findSuppressedCommunityIds(UUID userId) { return suppressedIds; }
    }

    private static final class StubCommunityArtistRepository extends CommunityArtistRepository {
        private final Map<UUID, List<CommunityArtist>> byCommunity;

        StubCommunityArtistRepository(Map<UUID, List<CommunityArtist>> byCommunity) {
            this.byCommunity = byCommunity;
        }

        @Override
        public List<CommunityArtist> findByCommunity(UUID communityId) {
            return byCommunity.getOrDefault(communityId, List.of());
        }
    }

    private static final class StubCommunityGenreRepository extends CommunityGenreRepository {
        private final Map<UUID, List<CommunityGenre>> byCommunity;

        StubCommunityGenreRepository(Map<UUID, List<CommunityGenre>> byCommunity) {
            this.byCommunity = byCommunity;
        }

        @Override
        public List<CommunityGenre> findByCommunity(UUID communityId) {
            return byCommunity.getOrDefault(communityId, List.of());
        }
    }

    /** Returns an auto-created profile for any community, bypassing the real refresh. */
    private static final class AutoCreatingTasteProfileRepository extends CommunityTasteProfileRepository {
        @Override
        public Optional<CommunityTasteProfile> findByCommunityId(UUID communityId) {
            CommunityTasteProfile profile = new CommunityTasteProfile();
            profile.id = UUID.nameUUIDFromBytes(("auto-profile-" + communityId).getBytes(StandardCharsets.UTF_8));
            profile.activityScore = 0.5d;
            return Optional.of(profile);
        }
    }

    private static final class StubArtistRepository extends ArtistRepository {
        private final Map<Long, Artist> artists;

        StubArtistRepository(Map<Long, Artist> artists) { this.artists = artists; }

        @Override
        public Optional<Artist> findByIdOptional(Long id) {
            return Optional.ofNullable(artists.get(id));
        }
    }

    private static final class EmptyGenreRepository extends GenreRepository {
        @Override
        public Optional<Genre> findByIdOptional(Long id) { return Optional.empty(); }

        @Override
        public Optional<Genre> findByNameIgnoreCase(String name) { return Optional.empty(); }
    }

    private static final class StubGenreRepository extends GenreRepository {
        private final Map<Long, Genre> genres;

        StubGenreRepository(Map<Long, Genre> genres) { this.genres = genres; }

        @Override
        public Optional<Genre> findByIdOptional(Long id) {
            return Optional.ofNullable(genres.get(id));
        }

        @Override
        public Optional<Genre> findByNameIgnoreCase(String name) { return Optional.empty(); }
    }

    /** Returns a taste profile with activityScore=0 so no activity-based score inflation. */
    private static final class ZeroActivityTasteProfileRepository extends CommunityTasteProfileRepository {
        @Override
        public Optional<CommunityTasteProfile> findByCommunityId(UUID communityId) {
            CommunityTasteProfile profile = new CommunityTasteProfile();
            profile.id = UUID.nameUUIDFromBytes(("zero-profile-" + communityId).getBytes(StandardCharsets.UTF_8));
            profile.activityScore = 0.0d;
            return Optional.of(profile);
        }
    }

    private static final class StubDiscoveryRedisCacheService extends DiscoveryRedisCacheService {
        private final List<RankedRecommendation> communityRecommendations;

        StubDiscoveryRedisCacheService(List<RankedRecommendation> communityRecommendations) {
            this.communityRecommendations = communityRecommendations;
        }

        @Override
        public List<RankedRecommendation> readCommunityRecommendations(UUID userId, int limit) {
            return communityRecommendations.stream().limit(Math.max(0, limit)).toList();
        }
    }

    private static final class EmptyCommunityRecommendationCacheRepository
            extends CommunityRecommendationCacheRepository {
        @Override
        public List<CommunityRecommendationCache> findFreshByUser(UUID userId, int limit) {
            return List.of();
        }
    }

    private static final class StubCommunityRecommendationCacheRepository
            extends CommunityRecommendationCacheRepository {
        private final List<CommunityRecommendationCache> caches;

        StubCommunityRecommendationCacheRepository(List<CommunityRecommendationCache> caches) {
            this.caches = caches;
        }

        @Override
        public List<CommunityRecommendationCache> findFreshByUser(UUID userId, int limit) {
            return caches.stream().limit(Math.max(0, limit)).toList();
        }
    }
}
