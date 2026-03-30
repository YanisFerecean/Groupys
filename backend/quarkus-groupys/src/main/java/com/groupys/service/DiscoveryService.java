package com.groupys.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.groupys.config.PerformanceFeatureFlags;
import com.groupys.client.SpotifyApiClient;
import com.groupys.dto.*;
import com.groupys.dto.spotify.SpotifyTopArtistsResponse;
import com.groupys.dto.spotify.SpotifyTopTracksResponse;
import com.groupys.model.*;
import com.groupys.repository.*;
import com.groupys.util.CountryUtil;
import com.groupys.util.DiscoveryScoreUtil;
import com.groupys.util.MusicIdentityUtil;
import io.quarkus.logging.Log;
import io.quarkus.runtime.ShutdownEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.rest.client.inject.RestClient;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@ApplicationScoped
public class DiscoveryService {

    private static final int TOP_ARTIST_LIMIT = 20;
    private static final int TOP_TRACK_LIMIT = 20;
    private static final String SOURCE_SPOTIFY_TOP_ARTISTS = "SPOTIFY_TOP_ARTISTS";
    private static final String SOURCE_SPOTIFY_TOP_TRACKS = "SPOTIFY_TOP_TRACKS";
    private static final String SOURCE_COMMUNITY_MEMBERSHIP = "COMMUNITY_MEMBERSHIP";
    private static final int CACHE_TTL_HOURS = 12;
    private static final DateTimeFormatter YEAR_FORMAT = DateTimeFormatter.ofPattern("yyyy").withZone(ZoneOffset.UTC);
    private static final DateTimeFormatter MONTH_FORMAT = DateTimeFormatter.ofPattern("MM").withZone(ZoneOffset.UTC);

    @Inject
    UserRepository userRepository;

    @Inject
    CommunityRepository communityRepository;

    @Inject
    CommunityMemberRepository communityMemberRepository;

    @Inject
    ArtistRepository artistRepository;

    @Inject
    GenreRepository genreRepository;

    @Inject
    TrackRepository trackRepository;

    @Inject
    ArtistGenreRepository artistGenreRepository;

    @Inject
    UserTasteProfileRepository userTasteProfileRepository;

    @Inject
    MusicSourceSnapshotRepository musicSourceSnapshotRepository;

    @Inject
    UserArtistPreferenceRepository userArtistPreferenceRepository;

    @Inject
    UserGenrePreferenceRepository userGenrePreferenceRepository;

    @Inject
    UserTrackPreferenceRepository userTrackPreferenceRepository;

    @Inject
    CommunityTasteProfileRepository communityTasteProfileRepository;

    @Inject
    CommunityArtistRepository communityArtistRepository;

    @Inject
    CommunityGenreRepository communityGenreRepository;

    @Inject
    UserFollowRepository userFollowRepository;

    @Inject
    ConversationRepository conversationRepository;

    @Inject
    UserLikeRepository userLikeRepository;

    @Inject
    UserDiscoveryActionRepository userDiscoveryActionRepository;

    @Inject
    UserSimilarityCacheRepository userSimilarityCacheRepository;

    @Inject
    CommunityRecommendationCacheRepository communityRecommendationCacheRepository;

    @Inject
    PostRepository postRepository;

    @Inject
    CommentRepository commentRepository;

    @Inject
    PostReactionRepository postReactionRepository;

    @Inject
    CommentReactionRepository commentReactionRepository;

    @Inject
    SpotifyService spotifyService;

    @Inject
    @RestClient
    SpotifyApiClient spotifyApiClient;

    @Inject
    DiscoveryService self;

    @Inject
    PerformanceFeatureFlags flags;

    @Inject
    DiscoveryRedisCacheService redisCacheService;

    @Inject
    TasteEmbeddingService tasteEmbeddingService;

    @Inject
    StorageService storageService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private volatile boolean shuttingDown;

    void onShutdown(@Observes ShutdownEvent event) {
        shuttingDown = true;
    }

    @Transactional
    public DiscoverySyncResDto syncMusic(String clerkId) {
        User user = getUserByClerkId(clerkId);
        String token = spotifyService.getValidAccessToken(clerkId);

        String artistsPayload = fetchSpotifyPayload(() -> spotifyApiClient.getTopArtists("Bearer " + token, TOP_ARTIST_LIMIT, "medium_term"));
        String tracksPayload = fetchSpotifyPayload(() -> spotifyApiClient.getTopTracks("Bearer " + token, TOP_TRACK_LIMIT, "medium_term"));

        MusicSourceSnapshot artistsSnapshot = persistSnapshot(user, SOURCE_SPOTIFY_TOP_ARTISTS, "TOP_ARTISTS", artistsPayload, "PROCESSED", null);
        MusicSourceSnapshot tracksSnapshot = persistSnapshot(user, SOURCE_SPOTIFY_TOP_TRACKS, "TOP_TRACKS", tracksPayload, "PROCESSED", null);

        String effectiveArtistsPayload = resolveSnapshotPayloadForProcessing(artistsSnapshot, artistsPayload);
        String effectiveTracksPayload = resolveSnapshotPayloadForProcessing(tracksSnapshot, tracksPayload);
        SpotifyTopArtistsResponse topArtists = readValue(effectiveArtistsPayload, SpotifyTopArtistsResponse.class);
        SpotifyTopTracksResponse topTracks = readValue(effectiveTracksPayload, SpotifyTopTracksResponse.class);

        userArtistPreferenceRepository.deleteByUser(user.id);
        userGenrePreferenceRepository.deleteByUser(user.id);
        userTrackPreferenceRepository.deleteByUser(user.id);

        Map<Long, Double> genreWeights = new LinkedHashMap<>();
        int artistCount = persistSpotifyArtistPreferences(user, topArtists, genreWeights);
        persistSpotifyTrackPreferences(user, topTracks, genreWeights);
        int genreCount = persistGenrePreferences(user, genreWeights);

        rebuildCommunityDerivedPreferences(user);
        refreshUserTasteProfile(user);
        refreshRelevantCommunityProfiles(user.id);
        int communityRecommendations = refreshCommunityRecommendations(user.id);
        int userRecommendations = refreshUserSimilarity(user.id);

        user.lastMusicSyncAt = Instant.now();

        return new DiscoverySyncResDto(
                artistCount,
                genreCount,
                communityRecommendations,
                userRecommendations,
                user.lastMusicSyncAt
        );
    }

    @Transactional
    public List<SuggestedCommunityResDto> getSuggestedCommunities(String clerkId, int limit, boolean refresh) {
        User user = getUserByClerkId(clerkId);
        int pageSize = Math.max(limit, 1);
        if (refresh) {
            refreshForUser(user.id);
        }
        if (flags.redisEnabled() && flags.redisRecommendationReadEnabled()) {
            List<SuggestedCommunityResDto> redisResult = loadCommunitySuggestionsFromRedis(user.id, pageSize);
            if (!redisResult.isEmpty()) {
                return redisResult;
            }
        }
        if (legacyRecommendationPostgresWriteEnabled()) {
            List<CommunityRecommendationCache> postgresCaches = communityRecommendationCacheRepository.findFreshByUser(user.id, pageSize);
            if (postgresCaches.isEmpty()) {
                refreshForUser(user.id);
                postgresCaches = communityRecommendationCacheRepository.findFreshByUser(user.id, pageSize);
            }
            if (!postgresCaches.isEmpty()) {
                return postgresCaches.stream()
                        .map(this::toSuggestedCommunity)
                        .toList();
            }
        }

        return computeCommunityRecommendationCaches(user.id).stream()
                .limit(pageSize)
                .map(this::toSuggestedCommunity)
                .toList();
    }

    @Transactional
    public List<SuggestedUserResDto> getSuggestedUsers(String clerkId, int limit, boolean refresh) {
        User user = getUserByClerkId(clerkId);
        int pageSize = Math.max(limit, 1);
        if (refresh) {
            refreshForUser(user.id);
        }
        Set<UUID> excludedUserIds = buildExcludedSuggestedUserIds(user.id);
        if (flags.redisEnabled() && flags.redisRecommendationReadEnabled()) {
            List<SuggestedUserResDto> redisResult = loadUserSuggestionsFromRedis(user.id, pageSize, excludedUserIds);
            if (!redisResult.isEmpty()) {
                return redisResult;
            }
        }
        if (legacyRecommendationPostgresWriteEnabled()) {
            List<UserSimilarityCache> postgresCaches = userSimilarityCacheRepository.findFreshByUser(user.id, 100).stream()
                    .filter(cache -> !excludedUserIds.contains(cache.candidateUser.id))
                    .limit(pageSize)
                    .toList();
            if (postgresCaches.isEmpty()) {
                refreshForUser(user.id);
                postgresCaches = userSimilarityCacheRepository.findFreshByUser(user.id, 100).stream()
                        .filter(cache -> !excludedUserIds.contains(cache.candidateUser.id))
                        .limit(pageSize)
                        .toList();
            }
            if (!postgresCaches.isEmpty()) {
                return postgresCaches.stream()
                        .map(this::toSuggestedUser)
                        .toList();
            }
        }

        return computeUserSimilarityCaches(user.id).stream()
                .limit(pageSize)
                .map(this::toSuggestedUser)
                .toList();
    }

    @Transactional
    public void dismissRecommendation(String clerkId, String targetType, UUID targetId, DiscoveryActionDto dto) {
        User user = getUserByClerkId(clerkId);
        UserDiscoveryAction action = new UserDiscoveryAction();
        action.user = user;
        action.targetType = normalizeTargetType(targetType);
        action.actionType = dto.actionType().trim().toUpperCase();
        action.surface = dto.surface().trim().toUpperCase();
        action.reasonCode = dto.reasonCode();
        action.metadataJson = dto.metadataJson();
        if (dto.ttlDays() != null && dto.ttlDays() > 0) {
            action.expiresAt = Instant.now().plus(dto.ttlDays(), ChronoUnit.DAYS);
        }
        if ("COMMUNITY".equals(action.targetType)) {
            action.targetCommunity = communityRepository.findByIdOptional(targetId)
                    .orElseThrow(() -> new NotFoundException("Community not found"));
            if (legacyRecommendationPostgresWriteEnabled()) {
                communityRecommendationCacheRepository.delete("user.id = ?1 and community.id = ?2", user.id, targetId);
            }
            if (flags.redisEnabled() && flags.redisRecommendationWriteEnabled()) {
                redisCacheService.removeCommunityCandidate(user.id, targetId);
            }
        } else {
            action.targetUser = userRepository.findByIdOptional(targetId)
                    .orElseThrow(() -> new NotFoundException("User not found"));
            if (legacyRecommendationPostgresWriteEnabled()) {
                userSimilarityCacheRepository.delete("user.id = ?1 and candidateUser.id = ?2", user.id, targetId);
            }
            if (flags.redisEnabled() && flags.redisRecommendationWriteEnabled()) {
                redisCacheService.removeUserCandidate(user.id, targetId);
            }
        }
        userDiscoveryActionRepository.persist(action);
    }

    @Transactional
    public UserFollowResDto followUser(String clerkId, UUID targetUserId) {
        User follower = getUserByClerkId(clerkId);
        if (follower.id.equals(targetUserId)) {
            throw new BadRequestException("Cannot follow yourself");
        }
        User followed = userRepository.findByIdOptional(targetUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        UserFollow follow = userFollowRepository.findByFollowerAndFollowed(follower.id, followed.id)
                .orElseGet(UserFollow::new);
        follow.followerUser = follower;
        follow.followedUser = followed;
        follow.status = "ACTIVE";
        if (follow.id == null) {
            userFollowRepository.persist(follow);
        }

        UserDiscoveryAction action = new UserDiscoveryAction();
        action.user = follower;
        action.targetType = "USER";
        action.targetUser = followed;
        action.actionType = "FOLLOW";
        action.surface = "PROFILE";
        userDiscoveryActionRepository.persist(action);

        refreshUserSimilarity(follower.id);
        refreshUserSimilarity(followed.id);

        return new UserFollowResDto(followed.id, true);
    }

    @Transactional
    public void refreshForUser(UUID userId) {
        User user = userRepository.findByIdOptional(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        rebuildCommunityDerivedPreferences(user);
        refreshUserTasteProfile(user);
        refreshRelevantCommunityProfiles(userId);
        refreshCommunityRecommendations(userId);
        refreshUserSimilarity(userId);
    }

    @Transactional
    public void refreshAfterCommunityChange(UUID userId, UUID communityId) {
        refreshCommunityProfile(communityId);
        refreshForUser(userId);
        communityMemberRepository.findByCommunity(communityId).stream()
                .map(member -> member.user.id)
                .distinct()
                .filter(id -> !id.equals(userId))
                .forEach(this::refreshForUser);
    }

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void refreshAfterCommunityActivity(UUID communityId) {
        refreshCommunityProfile(communityId);
        communityMemberRepository.findByCommunity(communityId).stream()
                .map(member -> member.user.id)
                .distinct()
                .forEach(this::refreshCommunityRecommendations);
    }

    @Transactional
    public void refreshAfterUserChange(UUID userId) {
        refreshForUser(userId);
    }

    private Set<UUID> buildExcludedSuggestedUserIds(UUID userId) {
        Set<UUID> excluded = new HashSet<>();
        userFollowRepository.findActiveByFollower(userId).stream()
                .map(follow -> follow.followedUser.id)
                .forEach(excluded::add);
        conversationRepository.findDirectConversationPartnerIds(userId)
                .forEach(excluded::add);
        userDiscoveryActionRepository.findSuppressedUserIds(userId)
                .forEach(excluded::add);
        userLikeRepository.findLikedUserIds(userId)
                .forEach(excluded::add);
        return excluded;
    }

    @Transactional
    public void removeCommunityReferences(UUID communityId, List<UUID> impactedUserIds) {
        communityRecommendationCacheRepository.delete("community.id", communityId);
        if (flags.redisEnabled() && flags.redisRecommendationWriteEnabled()) {
            redisCacheService.removeCommunityFromAllUsers(communityId);
        }
        communityArtistRepository.deleteByCommunity(communityId);
        communityGenreRepository.deleteByCommunity(communityId);
        communityTasteProfileRepository.delete("community.id", communityId);
        userDiscoveryActionRepository.delete("targetCommunity.id", communityId);
        impactedUserIds.forEach(this::refreshForUser);
    }

    public void refreshAllActiveUsers() {
        if (shuttingDown) {
            return;
        }

        for (UUID userId : userRepository.listActiveDiscoveryUserIds()) {
            if (shuttingDown) {
                break;
            }
            try {
                self.refreshForUser(userId);
            } catch (Exception e) {
                Log.warnf(e, "Failed to refresh discovery for user %s", userId);
            }
        }
    }

    private int refreshCommunityRecommendations(UUID userId) {
        List<CommunityRecommendationCache> sortedCaches = computeCommunityRecommendationCaches(userId);

        if (legacyRecommendationPostgresWriteEnabled()) {
            communityRecommendationCacheRepository.deleteByUser(userId);
            sortedCaches.forEach(communityRecommendationCacheRepository::persist);
        }
        if (flags.redisEnabled() && flags.redisRecommendationWriteEnabled()) {
            redisCacheService.clearCommunityRecommendations(userId);
            redisCacheService.writeCommunityRecommendations(userId, sortedCaches);
        }
        return sortedCaches.size();
    }

    List<CommunityRecommendationCache> computeCommunityRecommendationCaches(UUID userId) {
        User user = userRepository.findByIdOptional(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        Map<Long, UserArtistPreference> userArtists = userArtistPreferenceRepository.findByUser(userId).stream()
                .collect(Collectors.toMap(pref -> pref.artist.getId(), pref -> pref, (left, right) -> left, LinkedHashMap::new));
        Map<Long, UserGenrePreference> userGenres = userGenrePreferenceRepository.findByUser(userId).stream()
                .collect(Collectors.toMap(pref -> pref.genre.id, pref -> pref, (left, right) -> left, LinkedHashMap::new));
        List<UUID> joinedCommunityIds = communityMemberRepository.findByUser(userId).stream()
                .map(member -> member.community.id)
                .toList();
        Set<UUID> suppressedCommunityIds = userDiscoveryActionRepository.findSuppressedCommunityIds(userId);

        List<CommunityRecommendationCache> caches = new ArrayList<>();
        for (Community community : communityRepository.listDiscoverable()) {
            if (joinedCommunityIds.contains(community.id) || suppressedCommunityIds.contains(community.id)) {
                continue;
            }

            CommunityTasteProfile profile = ensureCommunityProfile(community.id);
            Map<Long, CommunityArtist> communityArtists = communityArtistRepository.findByCommunity(community.id).stream()
                    .collect(Collectors.toMap(item -> item.artist.getId(), item -> item, (left, right) -> left, LinkedHashMap::new));
            Map<Long, CommunityGenre> communityGenres = communityGenreRepository.findByCommunity(community.id).stream()
                    .collect(Collectors.toMap(item -> item.genre.id, item -> item, (left, right) -> left, LinkedHashMap::new));

            double artistScore = DiscoveryScoreUtil.weightedOverlap(
                    toScoreMap(userArtists, preference -> preference.normalizedScore),
                    toScoreMap(communityArtists, preference -> preference.normalizedScore)
            );
            double genreScore = DiscoveryScoreUtil.weightedOverlap(
                    toScoreMap(userGenres, preference -> preference.normalizedScore),
                    toScoreMap(communityGenres, preference -> preference.normalizedScore)
            );
            long sharedMembers = communityMemberRepository.countSharedMembers(community.id, joinedCommunityIds);
            double socialFit = DiscoveryScoreUtil.normalizedCount(sharedMembers, Math.max(1, community.memberCount));
            double activityFit = DiscoveryScoreUtil.clamp01(profile.activityScore != null ? profile.activityScore : 0d);
            if (community.memberCount > 0) {
                activityFit = Math.max(activityFit, DiscoveryScoreUtil.clamp01(community.memberCount / 25d) * 0.5d);
            }
            double countryScore = countryMatchScore(user, community);
            double novelty = community.memberCount <= 150 ? 1d : 0.6d;
            double finalScore = 0.35 * artistScore
                    + 0.25 * genreScore
                    + 0.15 * socialFit
                    + 0.10 * activityFit
                    + 0.10 * countryScore
                    + 0.05 * novelty;
            if (finalScore <= 0.05d) {
                continue;
            }

            CommunityRecommendationCache cache = new CommunityRecommendationCache();
            cache.user = user;
            cache.community = community;
            cache.score = finalScore;
            cache.artistOverlapScore = artistScore;
            cache.genreOverlapScore = genreScore;
            cache.socialFitScore = socialFit;
            cache.activityFitScore = activityFit;
            cache.countryScore = countryScore;
            cache.embeddingScore = 0d;

            Explanation explanation = buildCommunityExplanation(userArtists, userGenres, communityArtists, communityGenres,
                    (int) sharedMembers, countryScore > 0d);
            cache.primaryReasonCode = explanation.reasonCodes().isEmpty() ? null : explanation.reasonCodes().getFirst();
            cache.explanationJson = explanation.json();
            cache.expiresAt = Instant.now().plus(CACHE_TTL_HOURS, ChronoUnit.HOURS);
            caches.add(cache);
        }

        List<CommunityRecommendationCache> sortedCaches = caches.stream()
                .sorted(Comparator.comparingDouble((CommunityRecommendationCache item) -> item.score).reversed())
                .limit(100)
                .toList();
        for (int index = 0; index < sortedCaches.size(); index++) {
            CommunityRecommendationCache cache = sortedCaches.get(index);
            cache.rankPosition = index + 1;
        }
        return sortedCaches;
    }

    private int refreshUserSimilarity(UUID userId) {
        List<UserSimilarityCache> sortedCaches = computeUserSimilarityCaches(userId);

        if (legacyRecommendationPostgresWriteEnabled()) {
            userSimilarityCacheRepository.deleteByUser(userId);
            sortedCaches.forEach(userSimilarityCacheRepository::persist);
        }
        if (flags.redisEnabled() && flags.redisRecommendationWriteEnabled()) {
            redisCacheService.clearUserRecommendations(userId);
            redisCacheService.writeUserRecommendations(userId, sortedCaches);
        }
        return sortedCaches.size();
    }

    List<UserSimilarityCache> computeUserSimilarityCaches(UUID userId) {
        User user = userRepository.findByIdOptional(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        Map<Long, UserArtistPreference> userArtists = userArtistPreferenceRepository.findByUser(userId).stream()
                .collect(Collectors.toMap(pref -> pref.artist.getId(), pref -> pref, (left, right) -> left, LinkedHashMap::new));
        Map<Long, UserGenrePreference> userGenres = userGenrePreferenceRepository.findByUser(userId).stream()
                .collect(Collectors.toMap(pref -> pref.genre.id, pref -> pref, (left, right) -> left, LinkedHashMap::new));
        Set<UUID> excludedUserIds = buildExcludedSuggestedUserIds(userId);

        List<UserSimilarityCache> caches = new ArrayList<>();
        List<User> candidatePool = resolveDiscoveryCandidates(userId);
        for (User candidate : candidatePool) {
            if (excludedUserIds.contains(candidate.id)) {
                continue;
            }
            rebuildCommunityDerivedPreferences(candidate);
            refreshUserTasteProfile(candidate);

            Map<Long, UserArtistPreference> candidateArtists = userArtistPreferenceRepository.findByUser(candidate.id).stream()
                    .collect(Collectors.toMap(pref -> pref.artist.getId(), pref -> pref, (left, right) -> left, LinkedHashMap::new));
            Map<Long, UserGenrePreference> candidateGenres = userGenrePreferenceRepository.findByUser(candidate.id).stream()
                    .collect(Collectors.toMap(pref -> pref.genre.id, pref -> pref, (left, right) -> left, LinkedHashMap::new));

            double artistScore = DiscoveryScoreUtil.weightedOverlap(
                    toScoreMap(userArtists, preference -> preference.normalizedScore),
                    toScoreMap(candidateArtists, preference -> preference.normalizedScore)
            );
            double genreScore = DiscoveryScoreUtil.weightedOverlap(
                    toScoreMap(userGenres, preference -> preference.normalizedScore),
                    toScoreMap(candidateGenres, preference -> preference.normalizedScore)
            );
            long sharedCommunities = communityMemberRepository.countSharedCommunities(user.id, candidate.id);
            double sharedCommunityScore = DiscoveryScoreUtil.normalizedCount(sharedCommunities,
                    Math.max(1, Math.max(communityMemberRepository.findByUser(user.id).size(),
                            communityMemberRepository.findByUser(candidate.id).size())));
            UserTasteProfile userProfile = ensureUserProfile(user.id);
            UserTasteProfile candidateProfile = ensureUserProfile(candidate.id);
            double activityScore = 1d - Math.abs(
                    safeScore(userProfile.communityActivityScore) - safeScore(candidateProfile.communityActivityScore));
            activityScore = DiscoveryScoreUtil.clamp01(activityScore);
            double countryScore = countryMatchScore(user, candidate);
            long mutualFollows = userFollowRepository.countMutualFollowers(user.id, candidate.id);
            double followGraphScore = DiscoveryScoreUtil.normalizedCount(mutualFollows, 5);

            double finalScore = 0.30 * artistScore
                    + 0.20 * genreScore
                    + 0.20 * sharedCommunityScore
                    + 0.15 * activityScore
                    + 0.05 * countryScore
                    + 0.05 * followGraphScore;
            if (finalScore <= 0.05d) {
                continue;
            }

            UserSimilarityCache cache = new UserSimilarityCache();
            cache.user = user;
            cache.candidateUser = candidate;
            cache.score = finalScore;
            cache.artistOverlapScore = artistScore;
            cache.genreOverlapScore = genreScore;
            cache.sharedCommunitiesScore = sharedCommunityScore;
            cache.activityOverlapScore = activityScore;
            cache.countryScore = countryScore;
            cache.followGraphScore = followGraphScore;
            cache.embeddingScore = 0d;

            Explanation explanation = buildUserExplanation(userArtists, userGenres, candidateArtists, candidateGenres,
                    (int) sharedCommunities, countryScore > 0d, (int) mutualFollows);
            cache.primaryReasonCode = explanation.reasonCodes().isEmpty() ? null : explanation.reasonCodes().getFirst();
            cache.explanationJson = explanation.json();
            cache.expiresAt = Instant.now().plus(CACHE_TTL_HOURS, ChronoUnit.HOURS);
            caches.add(cache);
        }

        List<UserSimilarityCache> sortedCaches = caches.stream()
                .sorted(Comparator.comparingDouble((UserSimilarityCache item) -> item.score).reversed())
                .limit(100)
                .toList();
        return sortedCaches;
    }

    private void refreshRelevantCommunityProfiles(UUID userId) {
        Set<UUID> communityIds = new LinkedHashSet<>();
        communityMemberRepository.findByUser(userId).forEach(member -> communityIds.add(member.community.id));
        communityRepository.listDiscoverable().forEach(community -> communityIds.add(community.id));
        communityIds.forEach(this::refreshCommunityProfile);
    }

    private void refreshCommunityProfile(UUID communityId) {
        Community community = communityRepository.findByIdOptional(communityId)
                .orElseThrow(() -> new NotFoundException("Community not found"));
        List<CommunityMember> members = communityMemberRepository.findByCommunity(communityId);

        Map<Long, Double> artistWeights = new LinkedHashMap<>();
        Map<Long, Integer> artistSupport = new HashMap<>();
        Map<Long, Double> genreWeights = new LinkedHashMap<>();
        Map<Long, Integer> genreSupport = new HashMap<>();

        if (community.artist != null) {
            artistWeights.merge(community.artist.getId(), 2d, Double::sum);
            artistSupport.merge(community.artist.getId(), 1, Integer::sum);
        }

        findGenreForCommunity(community).ifPresent(genre -> {
            genreWeights.merge(genre.id, 2d, Double::sum);
            genreSupport.merge(genre.id, 1, Integer::sum);
        });

        for (CommunityMember member : members) {
            userArtistPreferenceRepository.findByUser(member.user.id).forEach(pref -> {
                artistWeights.merge(pref.artist.getId(), safeScore(pref.normalizedScore), Double::sum);
                artistSupport.merge(pref.artist.getId(), 1, Integer::sum);
            });
            userGenrePreferenceRepository.findByUser(member.user.id).forEach(pref -> {
                genreWeights.merge(pref.genre.id, safeScore(pref.normalizedScore), Double::sum);
                genreSupport.merge(pref.genre.id, 1, Integer::sum);
            });
        }

        communityArtistRepository.deleteByCommunity(communityId);
        communityGenreRepository.deleteByCommunity(communityId);

        Instant refreshedAt = Instant.now();
        artistWeights.entrySet().stream()
                .sorted(Map.Entry.<Long, Double>comparingByValue().reversed())
                .limit(25)
                .forEach(entry -> {
                    Artist artist = artistRepository.findByIdOptional(entry.getKey()).orElse(null);
                    if (artist == null) {
                        return;
                    }
                    CommunityArtist communityArtist = new CommunityArtist();
                    communityArtist.community = community;
                    communityArtist.artist = artist;
                    communityArtist.source = "AGGREGATED";
                    communityArtist.memberSupportCount = artistSupport.getOrDefault(entry.getKey(), 0);
                    communityArtist.rawScore = entry.getValue();
                    communityArtist.normalizedScore = DiscoveryScoreUtil.clamp01(entry.getValue() / Math.max(1, members.size() + 2));
                    communityArtist.refreshedAt = refreshedAt;
                    communityArtistRepository.persist(communityArtist);
                });

        genreWeights.entrySet().stream()
                .sorted(Map.Entry.<Long, Double>comparingByValue().reversed())
                .limit(25)
                .forEach(entry -> {
                    Genre genre = genreRepository.findByIdOptional(entry.getKey()).orElse(null);
                    if (genre == null) {
                        return;
                    }
                    CommunityGenre communityGenre = new CommunityGenre();
                    communityGenre.community = community;
                    communityGenre.genre = genre;
                    communityGenre.source = "AGGREGATED";
                    communityGenre.memberSupportCount = genreSupport.getOrDefault(entry.getKey(), 0);
                    communityGenre.rawScore = entry.getValue();
                    communityGenre.normalizedScore = DiscoveryScoreUtil.clamp01(entry.getValue() / Math.max(1, members.size() + 2));
                    communityGenre.refreshedAt = refreshedAt;
                    communityGenreRepository.persist(communityGenre);
                });

        CommunityTasteProfile profile = communityTasteProfileRepository.findByCommunityId(communityId)
                .orElseGet(CommunityTasteProfile::new);
        profile.community = community;
        profile.memberSampleSize = members.size();
        profile.topArtistsCount = Math.min(artistWeights.size(), 25);
        profile.topGenresCount = Math.min(genreWeights.size(), 25);
        profile.activityScore = DiscoveryScoreUtil.activityScore(
                postRepository.countByCommunity(communityId),
                commentRepository.countByCommunity(communityId),
                postReactionRepository.countByCommunity(communityId) + commentReactionRepository.countByCommunity(communityId)
        );
        String communityCountryCode = CountryUtil.resolveCountryCode(community.countryCode, community.country);
        community.countryCode = communityCountryCode;
        profile.countryCode = communityCountryCode;
        profile.tasteSummaryText = DiscoveryScoreUtil.buildTasteSummary(
                DiscoveryScoreUtil.topNames(resolveArtistNames(artistWeights), 3),
                DiscoveryScoreUtil.topNames(resolveGenreNames(genreWeights), 3)
        );
        profile.embeddingStatus = "NONE";
        profile.refreshedAt = refreshedAt;
        if (profile.id == null) {
            communityTasteProfileRepository.persist(profile);
        }

        community.lastProfileRefreshAt = refreshedAt;
        community.tasteSummaryText = profile.tasteSummaryText;
    }

    private void rebuildCommunityDerivedPreferences(User user) {
        userArtistPreferenceRepository.delete("user.id = ?1 and source = ?2", user.id, SOURCE_COMMUNITY_MEMBERSHIP);
        userGenrePreferenceRepository.delete("user.id = ?1 and source = ?2", user.id, SOURCE_COMMUNITY_MEMBERSHIP);

        Map<Long, Double> artistWeights = new LinkedHashMap<>();
        Map<Long, Double> genreWeights = new LinkedHashMap<>();
        for (CommunityMember membership : communityMemberRepository.findByUser(user.id)) {
            Community community = membership.community;
            if (community.artist != null) {
                artistWeights.merge(community.artist.getId(), 1d, Double::sum);
            }
            findGenreForCommunity(community).ifPresent(genre -> genreWeights.merge(genre.id, 1d, Double::sum));
        }

        artistWeights.forEach((artistId, weight) -> {
            Artist artist = artistRepository.findByIdOptional(artistId).orElse(null);
            if (artist == null) {
                return;
            }
            UserArtistPreference pref = new UserArtistPreference();
            pref.user = user;
            pref.artist = artist;
            pref.source = SOURCE_COMMUNITY_MEMBERSHIP;
            pref.rawScore = weight;
            pref.normalizedScore = DiscoveryScoreUtil.clamp01(weight / Math.max(1, artistWeights.size()));
            pref.confidence = 0.7d;
            userArtistPreferenceRepository.persist(pref);
        });

        genreWeights.forEach((genreId, weight) -> {
            Genre genre = genreRepository.findByIdOptional(genreId).orElse(null);
            if (genre == null) {
                return;
            }
            UserGenrePreference pref = new UserGenrePreference();
            pref.user = user;
            pref.genre = genre;
            pref.source = SOURCE_COMMUNITY_MEMBERSHIP;
            pref.rawScore = weight;
            pref.normalizedScore = DiscoveryScoreUtil.clamp01(weight / Math.max(1, genreWeights.size()));
            pref.confidence = 0.7d;
            userGenrePreferenceRepository.persist(pref);
        });
    }

    private void refreshUserTasteProfile(User user) {
        UserTasteProfile profile = userTasteProfileRepository.findByUserId(user.id)
                .orElseGet(UserTasteProfile::new);
        List<UserArtistPreference> artists = userArtistPreferenceRepository.findByUser(user.id);
        List<UserGenrePreference> genres = userGenrePreferenceRepository.findByUser(user.id);
        List<CommunityMember> memberships = communityMemberRepository.findByUser(user.id);

        profile.user = user;
        profile.topArtistsCount = artists.size();
        profile.topGenresCount = genres.size();
        profile.topTracksCount = 0;
        profile.joinedCommunitiesCount = memberships.size();
        profile.musicActivityScore = DiscoveryScoreUtil.clamp01((artists.size() + genres.size()) / 20d);
        profile.communityActivityScore = DiscoveryScoreUtil.activityScore(
                postRepository.countByAuthor(user.id),
                commentRepository.countByAuthor(user.id),
                postReactionRepository.countByUser(user.id) + commentReactionRepository.countByUser(user.id)
        );
        String userCountryCode = CountryUtil.resolveCountryCode(user.countryCode, user.country);
        user.countryCode = userCountryCode;
        profile.countryCode = userCountryCode;
        profile.tasteSummaryText = DiscoveryScoreUtil.buildTasteSummary(
                artists.stream().map(pref -> pref.artist.getName()).limit(3).toList(),
                genres.stream().map(pref -> pref.genre.name).limit(3).toList()
        );
        profile.embeddingStatus = "NONE";
        profile.refreshedAt = Instant.now();
        if (profile.id == null) {
            userTasteProfileRepository.persist(profile);
        }

        user.tasteSummaryText = profile.tasteSummaryText;
        if (flags.vectorReadEnabled() || flags.vectorBootstrapEnabled()) {
            tasteEmbeddingService.refreshUserEmbedding(user.id);
        }
    }

    private int persistSpotifyArtistPreferences(User user, SpotifyTopArtistsResponse topArtists, Map<Long, Double> genreWeights) {
        if (topArtists == null || topArtists.items() == null) {
            return 0;
        }
        int total = topArtists.items().size();
        for (int index = 0; index < topArtists.items().size(); index++) {
            SpotifyTopArtistsResponse.SpotifyArtistItem item = topArtists.items().get(index);
            Artist artist = resolveArtist(item);
            double normalized = DiscoveryScoreUtil.normalizedRankScore(index + 1, total);

            UserArtistPreference pref = new UserArtistPreference();
            pref.user = user;
            pref.artist = artist;
            pref.source = SOURCE_SPOTIFY_TOP_ARTISTS;
            pref.sourceWindow = "MEDIUM_TERM";
            pref.rankPosition = index + 1;
            pref.rawScore = (double) (total - index);
            pref.normalizedScore = normalized;
            pref.confidence = 1d;
            userArtistPreferenceRepository.persist(pref);

            if (item.genres() != null) {
                int genreRank = 0;
                for (String genreName : item.genres()) {
                    Genre genre = resolveGenre(genreName);
                    if (genre == null) {
                        continue;
                    }
                    upsertArtistGenre(artist, genre, genreRank++ == 0, normalized);
                    genreWeights.merge(genre.id, normalized, Double::sum);
                }
            }
        }
        return topArtists.items().size();
    }

    private void persistSpotifyTrackPreferences(User user, SpotifyTopTracksResponse topTracks, Map<Long, Double> genreWeights) {
        if (topTracks == null || topTracks.items() == null) {
            return;
        }
        int total = topTracks.items().size();
        for (int index = 0; index < topTracks.items().size(); index++) {
            SpotifyTopTracksResponse.SpotifyTrackItem item = topTracks.items().get(index);
            Track track = resolveTrack(item);
            double normalized = DiscoveryScoreUtil.normalizedRankScore(index + 1, total);

            UserTrackPreference trackPreference = new UserTrackPreference();
            trackPreference.user = user;
            trackPreference.track = track;
            trackPreference.source = SOURCE_SPOTIFY_TOP_TRACKS;
            trackPreference.sourceWindow = "MEDIUM_TERM";
            trackPreference.rankPosition = index + 1;
            trackPreference.rawScore = (double) (total - index);
            trackPreference.normalizedScore = normalized;
            userTrackPreferenceRepository.persist(trackPreference);

            if (item.artists() == null) {
                continue;
            }
            for (SpotifyTopTracksResponse.SpotifyArtistRef artistRef : item.artists()) {
                Artist artist = resolveArtist(artistRef);
                UserArtistPreference pref = new UserArtistPreference();
                pref.user = user;
                pref.artist = artist;
                pref.source = SOURCE_SPOTIFY_TOP_TRACKS;
                pref.sourceWindow = "MEDIUM_TERM";
                pref.rankPosition = index + 1;
                pref.rawScore = Math.max(1d, total - index - 0.5d);
                pref.normalizedScore = normalized * 0.7d;
                pref.confidence = 0.85d;
                userArtistPreferenceRepository.persist(pref);

                artistGenreRepository.findByArtist(artist.getId()).forEach(artistGenre ->
                        genreWeights.merge(artistGenre.genre.id, normalized * 0.7d, Double::sum));
            }
        }
    }

    private int persistGenrePreferences(User user, Map<Long, Double> genreWeights) {
        int size = genreWeights.size();
        if (size == 0) {
            return 0;
        }
        genreWeights.entrySet().stream()
                .sorted(Map.Entry.<Long, Double>comparingByValue().reversed())
                .forEach(entry -> {
                    Genre genre = genreRepository.findByIdOptional(entry.getKey()).orElse(null);
                    if (genre == null) {
                        return;
                    }
                    UserGenrePreference pref = new UserGenrePreference();
                    pref.user = user;
                    pref.genre = genre;
                    pref.source = "DERIVED";
                    pref.rawScore = entry.getValue();
                    pref.normalizedScore = DiscoveryScoreUtil.clamp01(entry.getValue() / Math.max(1d, size));
                    pref.confidence = 0.9d;
                    userGenrePreferenceRepository.persist(pref);
                });
        return size;
    }

    private User getUserByClerkId(String clerkId) {
        return userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    private String fetchSpotifyPayload(SpotifyRequest request) {
        try (Response response = request.execute()) {
            if (response.getStatus() != 200) {
                throw new BadRequestException("Spotify returned " + response.getStatus());
            }
            return response.readEntity(String.class);
        } catch (Exception e) {
            throw new BadRequestException("Failed to read Spotify data: " + e.getMessage(), e);
        }
    }

    MusicSourceSnapshot persistSnapshot(User user, String source, String snapshotType, String payload, String status, String error) {
        MusicSourceSnapshot snapshot = new MusicSourceSnapshot();
        snapshot.user = user;
        snapshot.source = source;
        snapshot.snapshotType = snapshotType;
        byte[] bytes = payload == null ? new byte[0] : payload.getBytes(StandardCharsets.UTF_8);
        boolean blobStored = false;
        if (flags.snapshotBlobWriteEnabled()) {
            try {
                String objectKey = buildSnapshotObjectKey(user.id, source, snapshotType);
                storageService.putObject(
                        flags.snapshotBucket(),
                        objectKey,
                        "application/json",
                        new ByteArrayInputStream(bytes),
                        bytes.length
                );
                snapshot.objectKey = objectKey;
                snapshot.payloadSizeBytes = (long) bytes.length;
                snapshot.checksum = sha256Hex(bytes);
                blobStored = true;
            } catch (Exception e) {
                Log.warnf(e, "Failed to persist snapshot blob for user %s source=%s type=%s", user.id, source, snapshotType);
            }
        }
        if (flags.snapshotPayloadJsonWriteEnabled() || !blobStored) {
            snapshot.payloadJson = payload;
        }
        snapshot.processingStatus = status;
        snapshot.processingError = error;
        snapshot.expiresAt = Instant.now().plus(7, ChronoUnit.DAYS);
        musicSourceSnapshotRepository.persist(snapshot);
        return snapshot;
    }

    String resolveSnapshotPayloadForProcessing(MusicSourceSnapshot snapshot, String inMemoryFallback) {
        if (flags.snapshotBlobReadEnabled()) {
            String resolved = readSnapshotPayload(snapshot);
            if (resolved != null && !resolved.isBlank()) {
                return resolved;
            }
        }
        if (snapshot != null && snapshot.payloadJson != null && !snapshot.payloadJson.isBlank()) {
            return snapshot.payloadJson;
        }
        return inMemoryFallback;
    }

    private String readSnapshotPayload(MusicSourceSnapshot snapshot) {
        if (snapshot == null) {
            return null;
        }
        if (snapshot.objectKey != null && !snapshot.objectKey.isBlank()) {
            try (InputStream stream = storageService.getObject(flags.snapshotBucket(), snapshot.objectKey)) {
                byte[] bytes = stream.readAllBytes();
                if (isSnapshotBlobValid(snapshot, bytes)) {
                    return new String(bytes, StandardCharsets.UTF_8);
                }
                Log.warnf("Snapshot blob integrity check failed for snapshot %s object=%s; falling back to payload_json",
                        snapshot.id, snapshot.objectKey);
            } catch (Exception e) {
                Log.warnf(e, "Failed to read snapshot blob for snapshot %s object=%s; falling back to payload_json",
                        snapshot.id, snapshot.objectKey);
            }
        }
        return snapshot.payloadJson;
    }

    private boolean isSnapshotBlobValid(MusicSourceSnapshot snapshot, byte[] bytes) {
        if (snapshot.payloadSizeBytes != null && snapshot.payloadSizeBytes.longValue() != bytes.length) {
            return false;
        }
        if (snapshot.checksum != null && !snapshot.checksum.isBlank()) {
            return snapshot.checksum.equalsIgnoreCase(sha256Hex(bytes));
        }
        return true;
    }

    private <T> T readValue(String payload, Class<T> clazz) {
        try {
            return objectMapper.readValue(payload, clazz);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to parse Spotify payload", e);
        }
    }

    private Artist resolveArtist(SpotifyTopArtistsResponse.SpotifyArtistItem item) {
        Artist artist = item.id() != null
                ? artistRepository.findBySpotifyId(item.id()).orElse(null)
                : null;
        if (artist == null && item.name() != null) {
            artist = artistRepository.findByNameIgnoreCase(item.name()).orElse(null);
        }
        if (artist == null) {
            artist = new Artist();
            artist.setId(MusicIdentityUtil.syntheticArtistId(item.id(), item.name()));
            artist.setName(item.name());
            artistRepository.persist(artist);
        }
        artist.setSpotifyId(firstNonBlank(item.id(), artist.getSpotifyId()));
        if (item.images() != null && !item.images().isEmpty()) {
            artist.setImages(item.images().stream().map(image -> image.url()).filter(Objects::nonNull).toList());
        }
        artist.setPopularityScore(item.popularity() != null ? item.popularity() / 100d : artist.getPopularityScore());
        return artist;
    }

    private Artist resolveArtist(SpotifyTopTracksResponse.SpotifyArtistRef item) {
        Artist artist = item.id() != null
                ? artistRepository.findBySpotifyId(item.id()).orElse(null)
                : null;
        if (artist == null && item.name() != null) {
            artist = artistRepository.findByNameIgnoreCase(item.name()).orElse(null);
        }
        if (artist == null) {
            artist = new Artist();
            artist.setId(MusicIdentityUtil.syntheticArtistId(item.id(), item.name()));
            artist.setName(item.name());
            artistRepository.persist(artist);
        }
        artist.setSpotifyId(firstNonBlank(item.id(), artist.getSpotifyId()));
        return artist;
    }

    private Track resolveTrack(SpotifyTopTracksResponse.SpotifyTrackItem item) {
        Track track = item.id() != null
                ? trackRepository.findBySpotifyId(item.id()).orElse(null)
                : null;
        String primaryArtist = item.artists() != null && !item.artists().isEmpty() ? item.artists().getFirst().name() : "unknown";
        if (track == null) {
            track = new Track();
            track.setId(MusicIdentityUtil.syntheticTrackId(item.id(), item.name(), primaryArtist));
            track.setTitle(item.name());
            trackRepository.persist(track);
        }
        track.setSpotifyId(firstNonBlank(item.id(), track.getSpotifyId()));
        track.setExternalIsrc(item.externalIds() != null ? item.externalIds().isrc() : track.getExternalIsrc());
        track.setPopularityScore(item.popularity() != null ? item.popularity() / 100d : track.getPopularityScore());
        if (item.artists() != null && !item.artists().isEmpty()) {
            track.setArtist(resolveArtist(item.artists().getFirst()));
        }
        return track;
    }

    private Genre resolveGenre(String genreName) {
        if (genreName == null || genreName.isBlank()) {
            return null;
        }
        return genreRepository.findByNameIgnoreCase(genreName.trim())
                .orElseGet(() -> {
                    Genre genre = new Genre();
                    genre.name = genreName.trim();
                    genreRepository.persist(genre);
                    return genre;
                });
    }

    private void upsertArtistGenre(Artist artist, Genre genre, boolean primary, double confidence) {
        ArtistGenre mapping = artistGenreRepository.findByArtistGenreSource(artist.getId(), genre.id, "SPOTIFY")
                .orElseGet(ArtistGenre::new);
        mapping.artist = artist;
        mapping.genre = genre;
        mapping.source = "SPOTIFY";
        mapping.confidence = confidence;
        mapping.primary = primary;
        if (mapping.id == null) {
            artistGenreRepository.persist(mapping);
        }
        if (primary) {
            artist.setPrimaryGenre(genre);
        }
        artist.setGenresEnriched(true);
    }

    private Optional<Genre> findGenreForCommunity(Community community) {
        if (community.genre == null || community.genre.isBlank()) {
            return Optional.empty();
        }
        return genreRepository.findByNameIgnoreCase(community.genre.trim());
    }

    private CommunityTasteProfile ensureCommunityProfile(UUID communityId) {
        CommunityTasteProfile profile = communityTasteProfileRepository.findByCommunityId(communityId).orElse(null);
        if (profile == null) {
            refreshCommunityProfile(communityId);
            profile = communityTasteProfileRepository.findByCommunityId(communityId).orElse(null);
        }
        if (profile == null) {
            throw new NotFoundException("Community profile not found");
        }
        return profile;
    }

    private UserTasteProfile ensureUserProfile(UUID userId) {
        UserTasteProfile profile = userTasteProfileRepository.findByUserId(userId).orElse(null);
        if (profile == null) {
            User user = userRepository.findByIdOptional(userId)
                    .orElseThrow(() -> new NotFoundException("User not found"));
            refreshUserTasteProfile(user);
            profile = userTasteProfileRepository.findByUserId(userId).orElse(null);
        }
        if (profile == null) {
            throw new NotFoundException("User profile not found");
        }
        return profile;
    }

    private Explanation buildCommunityExplanation(
            Map<Long, UserArtistPreference> userArtists,
            Map<Long, UserGenrePreference> userGenres,
            Map<Long, CommunityArtist> communityArtists,
            Map<Long, CommunityGenre> communityGenres,
            int sharedCommunityCount,
            boolean countryMatch
    ) {
        List<String> reasonCodes = new ArrayList<>();
        List<String> artistNames = intersectArtistNames(userArtists.keySet(), communityArtists.keySet());
        List<String> genreNames = intersectGenreNames(userGenres.keySet(), communityGenres.keySet());
        if (!artistNames.isEmpty()) {
            reasonCodes.add("SHARED_TOP_ARTISTS");
        }
        if (!genreNames.isEmpty()) {
            reasonCodes.add("SHARED_GENRES");
        }
        if (sharedCommunityCount > 0) {
            reasonCodes.add("SIMILAR_COMMUNITY_MEMBERS");
        }
        if (countryMatch) {
            reasonCodes.add("SAME_COUNTRY");
        }
        String explanation = buildExplanationText(artistNames, genreNames, sharedCommunityCount, countryMatch);
        return serializeExplanation(explanation, reasonCodes, artistNames, genreNames, sharedCommunityCount, countryMatch, 0);
    }

    private Explanation buildUserExplanation(
            Map<Long, UserArtistPreference> userArtists,
            Map<Long, UserGenrePreference> userGenres,
            Map<Long, UserArtistPreference> candidateArtists,
            Map<Long, UserGenrePreference> candidateGenres,
            int sharedCommunityCount,
            boolean countryMatch,
            int mutualFollowCount
    ) {
        List<String> reasonCodes = new ArrayList<>();
        List<String> artistNames = intersectArtistNames(userArtists.keySet(), candidateArtists.keySet());
        List<String> genreNames = intersectGenreNames(userGenres.keySet(), candidateGenres.keySet());
        if (!artistNames.isEmpty()) {
            reasonCodes.add("SHARED_TOP_ARTISTS");
        }
        if (!genreNames.isEmpty()) {
            reasonCodes.add("SHARED_GENRES");
        }
        if (sharedCommunityCount > 0) {
            reasonCodes.add("SHARED_COMMUNITIES");
        }
        if (countryMatch) {
            reasonCodes.add("SAME_COUNTRY");
        }
        if (mutualFollowCount > 0) {
            reasonCodes.add("FOLLOW_GRAPH_PROXIMITY");
        }
        String explanation = buildExplanationText(artistNames, genreNames, sharedCommunityCount, countryMatch);
        return serializeExplanation(explanation, reasonCodes, artistNames, genreNames, sharedCommunityCount, countryMatch, mutualFollowCount);
    }

    private Explanation serializeExplanation(String explanation,
                                             List<String> reasonCodes,
                                             List<String> artistNames,
                                             List<String> genreNames,
                                             int sharedCommunityCount,
                                             boolean countryMatch,
                                             int mutualFollowCount) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("explanation", explanation);
        payload.put("reasonCodes", reasonCodes);
        payload.put("matchedArtists", artistNames);
        payload.put("matchedGenres", genreNames);
        payload.put("sharedCommunityCount", sharedCommunityCount);
        payload.put("countryMatch", countryMatch);
        payload.put("mutualFollowCount", mutualFollowCount);
        try {
            return new Explanation(reasonCodes, objectMapper.writeValueAsString(payload));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize explanation", e);
        }
    }

    private String buildExplanationText(List<String> artistNames,
                                        List<String> genreNames,
                                        int sharedCommunityCount,
                                        boolean countryMatch) {
        if (!artistNames.isEmpty()) {
            return "Because you both like " + String.join(", ", artistNames);
        }
        if (!genreNames.isEmpty()) {
            return "Because you both lean " + String.join(", ", genreNames);
        }
        if (sharedCommunityCount > 0) {
            return "Because you already overlap on " + sharedCommunityCount + " communities";
        }
        if (countryMatch) {
            return "Relevant in your country";
        }
        return "Recommended from your taste and community activity";
    }

    private List<User> resolveDiscoveryCandidates(UUID userId) {
        if (flags.vectorReadEnabled() && tasteEmbeddingService.vectorReadyForUser(userId)) {
            List<UUID> candidateIds = tasteEmbeddingService.findTopKCandidates(userId, flags.vectorCandidateTopK());
            if (!candidateIds.isEmpty()) {
                Map<UUID, User> users = userRepository.findByIdsMap(candidateIds);
                return candidateIds.stream()
                        .map(users::get)
                        .filter(Objects::nonNull)
                        .toList();
            }
        }
        return userRepository.listDiscoveryVisible(userId);
    }

    private List<SuggestedUserResDto> loadUserSuggestionsFromRedis(UUID userId, int pageSize, Set<UUID> excludedUserIds) {
        List<DiscoveryRedisCacheService.RankedRecommendation> ranked = redisCacheService.readUserRecommendations(userId, 100);
        if (ranked.isEmpty()) {
            return List.of();
        }
        List<DiscoveryRedisCacheService.RankedRecommendation> filtered = ranked.stream()
                .filter(item -> !excludedUserIds.contains(item.id()))
                .limit(pageSize)
                .toList();
        if (filtered.isEmpty()) {
            return List.of();
        }
        List<UUID> ids = filtered.stream().map(DiscoveryRedisCacheService.RankedRecommendation::id).toList();
        Map<UUID, User> usersById = userRepository.findByIdsMap(ids);
        return filtered.stream()
                .map(item -> toSuggestedUser(usersById.get(item.id()), item.score(), item.explanationJson()))
                .filter(Objects::nonNull)
                .toList();
    }

    private List<SuggestedCommunityResDto> loadCommunitySuggestionsFromRedis(UUID userId, int pageSize) {
        List<DiscoveryRedisCacheService.RankedRecommendation> ranked = redisCacheService.readCommunityRecommendations(userId, pageSize);
        if (ranked.isEmpty()) {
            return List.of();
        }
        List<UUID> ids = ranked.stream().map(DiscoveryRedisCacheService.RankedRecommendation::id).toList();
        Map<UUID, Community> communitiesById = communityRepository.findByIdsMap(ids);
        return ranked.stream()
                .map(item -> toSuggestedCommunity(communitiesById.get(item.id()), item.score(), item.explanationJson()))
                .filter(Objects::nonNull)
                .toList();
    }

    private SuggestedCommunityResDto toSuggestedCommunity(CommunityRecommendationCache cache) {
        JsonNode explanation = readJson(cache.explanationJson);
        return new SuggestedCommunityResDto(
                cache.community.id,
                cache.community.name,
                cache.community.description,
                cache.community.imageUrl,
                cache.community.bannerUrl,
                cache.community.iconType,
                cache.community.iconEmoji,
                cache.community.iconUrl,
                cache.community.memberCount,
                cache.score,
                explanation.path("explanation").asText("Recommended from your taste and activity"),
                readTextList(explanation, "reasonCodes"),
                readMatchList(explanation, "matchedArtists"),
                readMatchList(explanation, "matchedGenres"),
                explanation.path("sharedCommunityCount").asInt(0),
                explanation.path("countryMatch").asBoolean(false),
                cache.community.createdBy != null ? cache.community.createdBy.username : null,
                cache.community.createdBy != null ? cache.community.createdBy.displayName : null,
                cache.community.createdBy != null ? cache.community.createdBy.profileImage : null
        );
    }

    private SuggestedCommunityResDto toSuggestedCommunity(Community community, double score, String explanationJson) {
        if (community == null) {
            return null;
        }
        JsonNode explanation = readJson(explanationJson);
        return new SuggestedCommunityResDto(
                community.id,
                community.name,
                community.description,
                community.imageUrl,
                community.bannerUrl,
                community.iconType,
                community.iconEmoji,
                community.iconUrl,
                community.memberCount,
                score,
                explanation.path("explanation").asText("Recommended from your taste and activity"),
                readTextList(explanation, "reasonCodes"),
                readMatchList(explanation, "matchedArtists"),
                readMatchList(explanation, "matchedGenres"),
                explanation.path("sharedCommunityCount").asInt(0),
                explanation.path("countryMatch").asBoolean(false),
                community.createdBy != null ? community.createdBy.username : null,
                community.createdBy != null ? community.createdBy.displayName : null,
                community.createdBy != null ? community.createdBy.profileImage : null
        );
    }

    private SuggestedUserResDto toSuggestedUser(UserSimilarityCache cache) {
        JsonNode explanation = readJson(cache.explanationJson);
        return new SuggestedUserResDto(
                cache.candidateUser.id,
                cache.candidateUser.username,
                cache.candidateUser.displayName,
                cache.candidateUser.profileImage,
                cache.score,
                explanation.path("explanation").asText("Recommended from your taste and activity"),
                readTextList(explanation, "reasonCodes"),
                readMatchList(explanation, "matchedArtists"),
                readMatchList(explanation, "matchedGenres"),
                explanation.path("sharedCommunityCount").asInt(0),
                explanation.path("countryMatch").asBoolean(false),
                explanation.path("mutualFollowCount").asInt(0)
        );
    }

    private SuggestedUserResDto toSuggestedUser(User candidateUser, double score, String explanationJson) {
        if (candidateUser == null) {
            return null;
        }
        JsonNode explanation = readJson(explanationJson);
        return new SuggestedUserResDto(
                candidateUser.id,
                candidateUser.username,
                candidateUser.displayName,
                candidateUser.profileImage,
                score,
                explanation.path("explanation").asText("Recommended from your taste and activity"),
                readTextList(explanation, "reasonCodes"),
                readMatchList(explanation, "matchedArtists"),
                readMatchList(explanation, "matchedGenres"),
                explanation.path("sharedCommunityCount").asInt(0),
                explanation.path("countryMatch").asBoolean(false),
                explanation.path("mutualFollowCount").asInt(0)
        );
    }

    private JsonNode readJson(String payload) {
        if (payload == null || payload.isBlank()) {
            return objectMapper.createObjectNode();
        }
        try {
            return objectMapper.readTree(payload);
        } catch (JsonProcessingException e) {
            Log.warn("Failed to parse discovery explanation payload", e);
            return objectMapper.createObjectNode();
        }
    }

    private List<String> readTextList(JsonNode node, String fieldName) {
        if (!node.has(fieldName) || !node.get(fieldName).isArray()) {
            return List.of();
        }
        List<String> values = new ArrayList<>();
        node.get(fieldName).forEach(item -> values.add(item.asText()));
        return values;
    }

    private List<DiscoveryMatchDto> readMatchList(JsonNode node, String fieldName) {
        return readTextList(node, fieldName).stream()
                .map(value -> new DiscoveryMatchDto(value, value))
                .toList();
    }

    private <K, T> Map<K, Double> toScoreMap(Map<K, T> input, ScoreExtractor<T> extractor) {
        return input.entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, entry -> safeScore(extractor.score(entry.getValue()))));
    }

    private double safeScore(Double score) {
        return score == null ? 0d : score;
    }

    private double countryMatchScore(User user, Community community) {
        return DiscoveryScoreUtil.countryMatchScore(resolveCountryValue(user.countryCode, user.country),
                resolveCountryValue(community.countryCode, community.country));
    }

    private double countryMatchScore(User left, User right) {
        return DiscoveryScoreUtil.countryMatchScore(resolveCountryValue(left.countryCode, left.country),
                resolveCountryValue(right.countryCode, right.country));
    }

    private Map<String, Double> resolveArtistNames(Map<Long, Double> weights) {
        Map<String, Double> names = new LinkedHashMap<>();
        weights.forEach((artistId, weight) -> artistRepository.findByIdOptional(artistId)
                .ifPresent(artist -> names.put(artist.getName(), weight)));
        return names;
    }

    private Map<String, Double> resolveGenreNames(Map<Long, Double> weights) {
        Map<String, Double> names = new LinkedHashMap<>();
        weights.forEach((genreId, weight) -> genreRepository.findByIdOptional(genreId)
                .ifPresent(genre -> names.put(genre.name, weight)));
        return names;
    }

    private List<String> intersectArtistNames(Set<Long> left, Set<Long> right) {
        List<String> names = new ArrayList<>();
        for (Long key : left) {
            if (!right.contains(key)) {
                continue;
            }
            artistRepository.findByIdOptional(key).ifPresent(artist -> names.add(artist.getName()));
            if (names.size() >= 3) {
                break;
            }
        }
        return names;
    }

    private List<String> intersectGenreNames(Set<Long> left, Set<Long> right) {
        List<String> names = new ArrayList<>();
        for (Long key : left) {
            if (!right.contains(key)) {
                continue;
            }
            genreRepository.findByIdOptional(key).ifPresent(genre -> names.add(genre.name));
            if (names.size() >= 3) {
                break;
            }
        }
        return names;
    }

    private String firstNonBlank(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) {
            return primary.trim();
        }
        if (fallback != null && !fallback.isBlank()) {
            return fallback.trim();
        }
        return null;
    }

    private String buildSnapshotObjectKey(UUID userId, String source, String snapshotType) {
        Instant now = Instant.now();
        String year = YEAR_FORMAT.format(now);
        String month = MONTH_FORMAT.format(now);
        return "%s/%s/%s/%s/%s/%s.json".formatted(
                userId,
                sanitizeKeyPart(source),
                sanitizeKeyPart(snapshotType),
                year,
                month,
                UUID.randomUUID()
        );
    }

    private String sanitizeKeyPart(String value) {
        if (value == null || value.isBlank()) {
            return "unknown";
        }
        return value.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9._-]", "-");
    }

    private String sha256Hex(byte[] payload) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(payload);
            StringBuilder builder = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                builder.append(String.format(Locale.ROOT, "%02x", b));
            }
            return builder.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to calculate snapshot checksum", e);
        }
    }

    private String resolveCountryValue(String primaryCode, String fallbackCountry) {
        String countryCode = CountryUtil.resolveCountryCode(primaryCode, fallbackCountry);
        return countryCode != null ? countryCode : firstNonBlank(primaryCode, fallbackCountry);
    }

    private String normalizeTargetType(String targetType) {
        String normalized = targetType == null ? "" : targetType.trim().toUpperCase(Locale.ROOT);
        if (!normalized.equals("COMMUNITY") && !normalized.equals("USER")) {
            throw new BadRequestException("Unsupported target type");
        }
        return normalized;
    }

    private boolean legacyRecommendationPostgresWriteEnabled() {
        return flags == null || flags.redisRecommendationLegacyPostgresWriteEnabled();
    }

    @FunctionalInterface
    private interface SpotifyRequest {
        Response execute();
    }

    @FunctionalInterface
    private interface ScoreExtractor<T> {
        Double score(T value);
    }

    private record Explanation(List<String> reasonCodes, String json) {
    }
}
