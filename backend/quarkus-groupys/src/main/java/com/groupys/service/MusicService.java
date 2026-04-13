package com.groupys.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.groupys.client.AppleMusicApiClient;
import com.groupys.dto.MusicAlbumResDto;
import com.groupys.dto.MusicArtistResDto;
import com.groupys.dto.MusicDeveloperTokenResDto;
import com.groupys.dto.MusicTrackResDto;
import com.groupys.model.User;
import com.groupys.repository.UserRepository;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.rest.client.inject.RestClient;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Supplier;

@ApplicationScoped
public class MusicService {

    private static final int DEFAULT_PROFILE_LIMIT = 3;
    private static final int FALLBACK_RECENT_LIMIT = 50;
    private static final int MAX_RATE_LIMIT_RETRIES = 3;
    private static final long INITIAL_RETRY_BACKOFF_MS = 250L;
    private static final String SIMULATOR_MOCK_TOKEN_PREFIX = "simulator_mock_";
    private static final String SIMULATOR_MOCK_PAYLOAD = "{\"source\":\"SIMULATOR_MOCK\"}";
    private static final List<MusicArtistItem> SIMULATOR_MOCK_ARTISTS = List.of(
            new MusicArtistItem("sim-artist-1", "The Weeknd", List.of("Pop"), 95, "https://picsum.photos/seed/groupys-artist-1/600/600"),
            new MusicArtistItem("sim-artist-2", "SZA", List.of("R&B"), 93, "https://picsum.photos/seed/groupys-artist-2/600/600"),
            new MusicArtistItem("sim-artist-3", "Fred again..", List.of("Electronic"), 90, "https://picsum.photos/seed/groupys-artist-3/600/600")
    );
    private static final List<MusicTrackItem> SIMULATOR_MOCK_TRACKS = List.of(
            new MusicTrackItem(
                    "sim-track-1",
                    "Blinding Lights",
                    95,
                    "USUG11904223",
                    List.of(new MusicArtistRef("sim-artist-1", "The Weeknd")),
                    new MusicAlbumRef("sim-album-1", "After Hours", "https://picsum.photos/seed/groupys-album-1/600/600")
            ),
            new MusicTrackItem(
                    "sim-track-2",
                    "Snooze",
                    93,
                    "USRC12301234",
                    List.of(new MusicArtistRef("sim-artist-2", "SZA")),
                    new MusicAlbumRef("sim-album-2", "SOS", "https://picsum.photos/seed/groupys-album-2/600/600")
            ),
            new MusicTrackItem(
                    "sim-track-3",
                    "Marea (we've lost dancing)",
                    90,
                    "GBARL2100450",
                    List.of(new MusicArtistRef("sim-artist-3", "Fred again..")),
                    new MusicAlbumRef("sim-album-3", "Actual Life", "https://picsum.photos/seed/groupys-album-3/600/600")
            )
    );
    private static final List<MusicAlbumItem> SIMULATOR_MOCK_ALBUMS = List.of(
            new MusicAlbumItem("sim-album-1", "After Hours", "The Weeknd", "https://picsum.photos/seed/groupys-album-1/600/600"),
            new MusicAlbumItem("sim-album-2", "SOS", "SZA", "https://picsum.photos/seed/groupys-album-2/600/600"),
            new MusicAlbumItem("sim-album-3", "Actual Life", "Fred again..", "https://picsum.photos/seed/groupys-album-3/600/600")
    );

    @Inject
    UserRepository userRepository;

    @Inject
    AppleDeveloperTokenService developerTokenService;

    @RestClient
    AppleMusicApiClient appleMusicApi;

    @ConfigProperty(name = "music.simulator-mock-enabled", defaultValue = "false")
    boolean simulatorMockEnabled;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public MusicDeveloperTokenResDto getDeveloperToken() {
        return new MusicDeveloperTokenResDto(
                developerTokenService.getDeveloperToken(),
                developerTokenService.getDeveloperTokenExpiryEpochSeconds()
        );
    }

    @Transactional
    public void connect(String clerkId, String musicUserToken) {
        String token = requireToken(musicUserToken);
        if (!useSimulatorMock(token)) {
            validateMusicUserToken(token);
        }

        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        user.appleMusicUserToken = token;
        user.appleMusicConnectedAt = Instant.now();
    }

    @Transactional
    public void disconnect(String clerkId) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        user.appleMusicUserToken = null;
        user.appleMusicConnectedAt = null;
    }

    public List<MusicArtistResDto> getTopArtists(String clerkId) {
        String musicUserToken = getValidUserToken(clerkId);
        if (useSimulatorMock(musicUserToken)) {
            return simulatorTopArtists(DEFAULT_PROFILE_LIMIT);
        }

        TopArtistsData topArtists = fetchTopArtistsForToken(musicUserToken, DEFAULT_PROFILE_LIMIT);
        return topArtists.items().stream()
                .limit(DEFAULT_PROFILE_LIMIT)
                .map(item -> new MusicArtistResDto(item.name(), item.imageUrl()))
                .toList();
    }

    public List<MusicArtistResDto> getTopArtistsByUserId(String userId) {
        String musicUserToken = getValidUserTokenByUserId(userId);
        if (useSimulatorMock(musicUserToken)) {
            return simulatorTopArtists(DEFAULT_PROFILE_LIMIT);
        }

        TopArtistsData topArtists = fetchTopArtistsForToken(musicUserToken, DEFAULT_PROFILE_LIMIT);
        return topArtists.items().stream()
                .limit(DEFAULT_PROFILE_LIMIT)
                .map(item -> new MusicArtistResDto(item.name(), item.imageUrl()))
                .toList();
    }

    public List<MusicTrackResDto> getTopTracks(String clerkId) {
        String musicUserToken = getValidUserToken(clerkId);
        if (useSimulatorMock(musicUserToken)) {
            return simulatorTopTracks(DEFAULT_PROFILE_LIMIT);
        }

        TopTracksData topTracks = fetchTopTracksForToken(musicUserToken, DEFAULT_PROFILE_LIMIT);
        return topTracks.items().stream()
                .limit(DEFAULT_PROFILE_LIMIT)
                .map(this::toTrackDto)
                .toList();
    }

    public List<MusicTrackResDto> getTopTracksByUserId(String userId) {
        String musicUserToken = getValidUserTokenByUserId(userId);
        if (useSimulatorMock(musicUserToken)) {
            return simulatorTopTracks(DEFAULT_PROFILE_LIMIT);
        }

        TopTracksData topTracks = fetchTopTracksForToken(musicUserToken, DEFAULT_PROFILE_LIMIT);
        return topTracks.items().stream()
                .limit(DEFAULT_PROFILE_LIMIT)
                .map(this::toTrackDto)
                .toList();
    }

    public List<MusicAlbumResDto> getTopAlbums(String clerkId) {
        String musicUserToken = getValidUserToken(clerkId);
        if (useSimulatorMock(musicUserToken)) {
            return simulatorTopAlbums(DEFAULT_PROFILE_LIMIT);
        }

        TopAlbumsData topAlbums = fetchTopAlbumsForToken(musicUserToken, DEFAULT_PROFILE_LIMIT);
        return topAlbums.items().stream()
                .limit(DEFAULT_PROFILE_LIMIT)
                .map(item -> new MusicAlbumResDto(item.name(), item.artistName(), item.coverUrl()))
                .toList();
    }

    public List<MusicAlbumResDto> getTopAlbumsByUserId(String userId) {
        String musicUserToken = getValidUserTokenByUserId(userId);
        if (useSimulatorMock(musicUserToken)) {
            return simulatorTopAlbums(DEFAULT_PROFILE_LIMIT);
        }

        TopAlbumsData topAlbums = fetchTopAlbumsForToken(musicUserToken, DEFAULT_PROFILE_LIMIT);
        return topAlbums.items().stream()
                .limit(DEFAULT_PROFILE_LIMIT)
                .map(item -> new MusicAlbumResDto(item.name(), item.artistName(), item.coverUrl()))
                .toList();
    }

    public MusicTrackResDto getCurrentlyPlaying(String clerkId) {
        String musicUserToken = getValidUserToken(clerkId);
        if (useSimulatorMock(musicUserToken)) {
            return SIMULATOR_MOCK_TRACKS.isEmpty() ? null : toTrackDto(SIMULATOR_MOCK_TRACKS.getFirst());
        }
        return getMostRecentTrackForToken(musicUserToken);
    }

    public MusicTrackResDto getCurrentlyPlayingByUserId(String userId) {
        String musicUserToken = getValidUserTokenByUserId(userId);
        if (useSimulatorMock(musicUserToken)) {
            return SIMULATOR_MOCK_TRACKS.isEmpty() ? null : toTrackDto(SIMULATOR_MOCK_TRACKS.getFirst());
        }
        return getMostRecentTrackForToken(musicUserToken);
    }

    public DiscoveryPayload fetchDiscoveryPayload(String clerkId, int artistLimit, int trackLimit) {
        String token = getValidUserToken(clerkId);
        if (useSimulatorMock(token)) {
            return simulatorDiscoveryPayload(artistLimit, trackLimit);
        }

        TopArtistsData artistsData = fetchTopArtistsForToken(token, artistLimit);
        TopTracksData tracksData = fetchTopTracksForToken(token, trackLimit);
        return new DiscoveryPayload(
                artistsData.payload(),
                tracksData.payload(),
                artistsData.items(),
                tracksData.items()
        );
    }

    private boolean useSimulatorMock(String musicUserToken) {
        return simulatorMockEnabled
                && musicUserToken != null
                && musicUserToken.startsWith(SIMULATOR_MOCK_TOKEN_PREFIX);
    }

    private DiscoveryPayload simulatorDiscoveryPayload(int artistLimit, int trackLimit) {
        int artistsLimit = Math.max(0, artistLimit);
        int tracksLimit = Math.max(0, trackLimit);
        List<MusicArtistItem> artists = SIMULATOR_MOCK_ARTISTS.stream()
                .limit(artistsLimit)
                .toList();
        List<MusicTrackItem> tracks = SIMULATOR_MOCK_TRACKS.stream()
                .limit(tracksLimit)
                .toList();
        return new DiscoveryPayload(
                SIMULATOR_MOCK_PAYLOAD,
                SIMULATOR_MOCK_PAYLOAD,
                artists,
                tracks
        );
    }

    private List<MusicArtistResDto> simulatorTopArtists(int limit) {
        int safeLimit = Math.max(0, limit);
        return SIMULATOR_MOCK_ARTISTS.stream()
                .limit(safeLimit)
                .map(item -> new MusicArtistResDto(item.name(), item.imageUrl()))
                .toList();
    }

    private List<MusicTrackResDto> simulatorTopTracks(int limit) {
        int safeLimit = Math.max(0, limit);
        return SIMULATOR_MOCK_TRACKS.stream()
                .limit(safeLimit)
                .map(this::toTrackDto)
                .toList();
    }

    private List<MusicAlbumResDto> simulatorTopAlbums(int limit) {
        int safeLimit = Math.max(0, limit);
        return SIMULATOR_MOCK_ALBUMS.stream()
                .limit(safeLimit)
                .map(item -> new MusicAlbumResDto(item.name(), item.artistName(), item.coverUrl()))
                .toList();
    }

    public String getValidUserToken(String clerkId) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        return getValidUserToken(user);
    }

    public String getValidUserTokenByUserId(String userId) {
        User user = userRepository.findByIdOptional(java.util.UUID.fromString(userId))
                .orElseThrow(() -> new NotFoundException("User not found"));
        return getValidUserToken(user);
    }

    private String getValidUserToken(User user) {
        if (user.appleMusicUserToken == null || user.appleMusicUserToken.isBlank()) {
            throw new BadRequestException("Apple Music not connected");
        }
        return user.appleMusicUserToken;
    }

    private void validateMusicUserToken(String musicUserToken) {
        String bearer = "Bearer " + developerTokenService.getDeveloperToken();
        try (Response response = executeWithRetry(() ->
                appleMusicApi.getMyStorefront(bearer, musicUserToken), "validate music user token")) {
            if (response.getStatus() == 200) {
                return;
            }
            throwForAppleStatus("validate music user token", response.getStatus(), true);
        }
    }

    private TopArtistsData fetchTopArtistsForToken(String musicUserToken, int limit) {
        String replayPayload = fetchReplayPayload(musicUserToken);
        List<MusicArtistItem> replayArtists = parseArtistsFromPayload(replayPayload, limit);
        if (!replayArtists.isEmpty()) {
            return new TopArtistsData(replayPayload, replayArtists);
        }

        FallbackTracks fallbackTracks = fetchFallbackTracks(musicUserToken, Math.max(limit * 6, FALLBACK_RECENT_LIMIT));
        List<MusicArtistItem> artists = deriveTopArtistsFromTracks(fallbackTracks.tracks(), limit);
        return new TopArtistsData(fallbackTracks.payload(), artists);
    }

    private TopTracksData fetchTopTracksForToken(String musicUserToken, int limit) {
        String replayPayload = fetchReplayPayload(musicUserToken);
        List<MusicTrackItem> replayTracks = parseTracksFromPayload(replayPayload, limit);
        if (!replayTracks.isEmpty()) {
            return new TopTracksData(replayPayload, replayTracks);
        }

        FallbackTracks fallbackTracks = fetchFallbackTracks(musicUserToken, Math.max(limit * 6, FALLBACK_RECENT_LIMIT));
        List<MusicTrackItem> tracks = fallbackTracks.tracks().stream().limit(limit).toList();
        return new TopTracksData(fallbackTracks.payload(), tracks);
    }

    private TopAlbumsData fetchTopAlbumsForToken(String musicUserToken, int limit) {
        String replayPayload = fetchReplayPayload(musicUserToken);
        List<MusicAlbumItem> replayAlbums = parseAlbumsFromPayload(replayPayload, limit);
        if (!replayAlbums.isEmpty()) {
            return new TopAlbumsData(replayPayload, replayAlbums);
        }

        FallbackTracks fallbackTracks = fetchFallbackTracks(musicUserToken, Math.max(limit * 6, FALLBACK_RECENT_LIMIT));
        List<MusicAlbumItem> albums = deriveTopAlbumsFromTracks(fallbackTracks.tracks(), limit);
        return new TopAlbumsData(fallbackTracks.payload(), albums);
    }

    private MusicTrackResDto getMostRecentTrackForToken(String musicUserToken) {
        FallbackTracks fallbackTracks = fetchFallbackTracks(musicUserToken, 1);
        if (fallbackTracks.tracks().isEmpty()) {
            return null;
        }
        return toTrackDto(fallbackTracks.tracks().getFirst());
    }

    private String fetchReplayPayload(String musicUserToken) {
        String bearer = "Bearer " + developerTokenService.getDeveloperToken();
        try (Response response = executeWithRetry(() ->
                appleMusicApi.getMusicSummaries(bearer, musicUserToken, "latest", "top-artists,top-songs,top-albums"),
                "fetch replay summary")) {
            int status = response.getStatus();
            if (status == 200) {
                return response.readEntity(String.class);
            }
            if (status == 204 || status == 404) {
                return null;
            }
            throwForAppleStatus("fetch replay summary", status, false);
            return null;
        }
    }

    private FallbackTracks fetchFallbackTracks(String musicUserToken, int limit) {
        String bearer = "Bearer " + developerTokenService.getDeveloperToken();
        String recentPayload = fetchRecentPayload(bearer, musicUserToken, limit);
        String heavyPayload = fetchHeavyRotationPayload(bearer, musicUserToken, Math.max(10, limit / 2));

        List<MusicTrackItem> recentTracks = parseTracksFromPayload(recentPayload, limit);
        List<MusicTrackItem> heavyTracks = parseTracksFromPayload(heavyPayload, limit);
        List<MusicTrackItem> merged = mergeTracks(recentTracks, heavyTracks, limit);
        return new FallbackTracks(buildFallbackPayload(recentPayload, heavyPayload), merged);
    }

    private String fetchRecentPayload(String bearer, String musicUserToken, int limit) {
        try (Response response = executeWithRetry(() ->
                appleMusicApi.getRecentlyPlayedTracks(bearer, musicUserToken, Math.max(1, limit)),
                "fetch recently played tracks")) {
            if (response.getStatus() == 200) {
                return response.readEntity(String.class);
            }
            throwForAppleStatus("fetch recently played tracks", response.getStatus(), true);
            return null;
        }
    }

    private String fetchHeavyRotationPayload(String bearer, String musicUserToken, int limit) {
        try (Response response = executeWithRetry(() ->
                appleMusicApi.getHeavyRotation(bearer, musicUserToken, Math.max(1, limit)),
                "fetch heavy rotation")) {
            int status = response.getStatus();
            if (status == 200) {
                return response.readEntity(String.class);
            }
            if (status == 204 || status == 404) {
                return null;
            }
            throwForAppleStatus("fetch heavy rotation", status, false);
            return null;
        }
    }

    private Response executeWithRetry(Supplier<Response> call, String operation) {
        long backoffMs = INITIAL_RETRY_BACKOFF_MS;
        for (int attempt = 1; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
            Response response = call.get();
            if (response.getStatus() != 429 || attempt == MAX_RATE_LIMIT_RETRIES) {
                return response;
            }
            response.close();
            try {
                long jitter = ThreadLocalRandom.current().nextLong(50L, 150L);
                Thread.sleep(backoffMs + jitter);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Interrupted while retrying Apple Music call: " + operation, e);
            }
            backoffMs = Math.min(backoffMs * 2L, 2000L);
        }
        throw new IllegalStateException("Unexpected retry loop exit for " + operation);
    }

    private void throwForAppleStatus(String operation, int status, boolean strict) {
        if (status == 401) {
            throw new WebApplicationException("Apple Music authorization failed (401) during " + operation, 401);
        }
        if (status == 403) {
            throw new WebApplicationException("Apple Music token forbidden (403) during " + operation, 403);
        }
        if (status == 429) {
            throw new WebApplicationException("Apple Music rate limit exceeded during " + operation, 429);
        }
        if (strict) {
            throw new BadRequestException("Apple Music request failed (" + status + ") during " + operation);
        }
        Log.debugf("Apple Music request returned %d during %s; trying fallback", status, operation);
    }

    private String buildFallbackPayload(String recentPayload, String heavyPayload) {
        try {
            ObjectNode root = objectMapper.createObjectNode();
            root.put("source", "APPLE_FALLBACK");
            root.set("recentPlayed", parseNodeOrNull(recentPayload));
            root.set("heavyRotation", parseNodeOrNull(heavyPayload));
            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            return "{\"source\":\"APPLE_FALLBACK\"}";
        }
    }

    private JsonNode parseNodeOrNull(String payload) {
        if (payload == null || payload.isBlank()) {
            return objectMapper.nullNode();
        }
        try {
            return objectMapper.readTree(payload);
        } catch (Exception e) {
            return objectMapper.nullNode();
        }
    }

    private List<MusicTrackItem> mergeTracks(List<MusicTrackItem> primary, List<MusicTrackItem> secondary, int limit) {
        LinkedHashMap<String, MusicTrackItem> merged = new LinkedHashMap<>();
        for (MusicTrackItem item : primary) {
            merged.put(trackKey(item), item);
            if (merged.size() >= limit) {
                return new ArrayList<>(merged.values());
            }
        }
        for (MusicTrackItem item : secondary) {
            merged.putIfAbsent(trackKey(item), item);
            if (merged.size() >= limit) {
                break;
            }
        }
        return new ArrayList<>(merged.values());
    }

    private String trackKey(MusicTrackItem item) {
        if (item.id() != null && !item.id().isBlank()) {
            return "id:" + item.id();
        }
        String artist = item.artists() != null && !item.artists().isEmpty()
                ? item.artists().getFirst().name()
                : "";
        return "name:" + normalize(item.name()) + "::" + normalize(artist);
    }

    private List<MusicArtistItem> deriveTopArtistsFromTracks(List<MusicTrackItem> tracks, int limit) {
        LinkedHashMap<String, ArtistAccumulator> accumulators = new LinkedHashMap<>();
        int total = Math.max(1, tracks.size());
        for (int i = 0; i < tracks.size(); i++) {
            MusicTrackItem track = tracks.get(i);
            double weight = Math.max(1d, total - i);
            if (track.artists() == null) {
                continue;
            }
            for (MusicArtistRef artist : track.artists()) {
                String key = artist.id() != null && !artist.id().isBlank()
                        ? artist.id()
                        : normalize(artist.name());
                ArtistAccumulator accumulator = accumulators.computeIfAbsent(key, ignored -> new ArtistAccumulator(
                        artist.id(),
                        artist.name(),
                        null
                ));
                accumulator.score += weight;
            }
        }

        return accumulators.values().stream()
                .sorted((a, b) -> Double.compare(b.score, a.score))
                .limit(limit)
                .map(acc -> new MusicArtistItem(acc.id, acc.name, List.of(), null, acc.imageUrl))
                .toList();
    }

    private List<MusicAlbumItem> deriveTopAlbumsFromTracks(List<MusicTrackItem> tracks, int limit) {
        LinkedHashMap<String, AlbumAccumulator> accumulators = new LinkedHashMap<>();
        int total = Math.max(1, tracks.size());
        for (int i = 0; i < tracks.size(); i++) {
            MusicTrackItem track = tracks.get(i);
            if (track.album() == null || track.album().name() == null || track.album().name().isBlank()) {
                continue;
            }
            double weight = Math.max(1d, total - i);
            String key = track.album().id() != null && !track.album().id().isBlank()
                    ? track.album().id()
                    : normalize(track.album().name());
            String artistName = track.artists() != null && !track.artists().isEmpty()
                    ? track.artists().getFirst().name()
                    : "";
            AlbumAccumulator accumulator = accumulators.computeIfAbsent(key, ignored -> new AlbumAccumulator(
                    track.album().id(),
                    track.album().name(),
                    artistName,
                    track.album().coverUrl()
            ));
            accumulator.score += weight;
        }

        return accumulators.values().stream()
                .sorted((a, b) -> Double.compare(b.score, a.score))
                .limit(limit)
                .map(acc -> new MusicAlbumItem(acc.id, acc.name, acc.artistName, acc.coverUrl))
                .toList();
    }

    private List<MusicArtistItem> parseArtistsFromPayload(String payload, int limit) {
        List<JsonNode> artistNodes = extractResourcesByType(payload, Set.of("artist"));
        if (artistNodes.isEmpty()) {
            return List.of();
        }

        List<MusicArtistItem> artists = new ArrayList<>();
        LinkedHashSet<String> seen = new LinkedHashSet<>();
        for (JsonNode node : artistNodes) {
            String id = text(node, "id");
            JsonNode attributes = node.path("attributes");
            String name = firstNonBlank(
                    text(attributes, "name"),
                    text(attributes, "artistName")
            );
            if (name == null || name.isBlank()) {
                continue;
            }
            String key = id != null && !id.isBlank() ? id : normalize(name);
            if (!seen.add(key)) {
                continue;
            }
            artists.add(new MusicArtistItem(
                    id,
                    name,
                    parseStringArray(attributes.path("genreNames")),
                    integer(attributes, "popularity"),
                    extractArtworkUrl(attributes.path("artwork"))
            ));
            if (artists.size() >= limit) {
                break;
            }
        }
        return artists;
    }

    private List<MusicTrackItem> parseTracksFromPayload(String payload, int limit) {
        List<JsonNode> trackNodes = extractResourcesByType(payload, Set.of("song", "track"));
        if (trackNodes.isEmpty()) {
            return List.of();
        }

        Map<String, JsonNode> resourceMap = buildResourceMap(trackNodes);
        List<MusicTrackItem> tracks = new ArrayList<>();
        LinkedHashSet<String> seen = new LinkedHashSet<>();
        for (JsonNode node : trackNodes) {
            JsonNode attributes = node.path("attributes");
            String id = text(node, "id");
            String name = firstNonBlank(text(attributes, "name"), text(attributes, "title"));
            if (name == null || name.isBlank()) {
                continue;
            }

            String key = id != null && !id.isBlank() ? id : normalize(name);
            if (!seen.add(key)) {
                continue;
            }

            List<MusicArtistRef> artists = parseTrackArtists(node, resourceMap, attributes);
            MusicAlbumRef album = parseTrackAlbum(node, resourceMap, attributes);
            tracks.add(new MusicTrackItem(
                    id,
                    name,
                    integer(attributes, "popularity"),
                    text(attributes, "isrc"),
                    artists,
                    album
            ));
            if (tracks.size() >= limit) {
                break;
            }
        }
        return tracks;
    }

    private List<MusicAlbumItem> parseAlbumsFromPayload(String payload, int limit) {
        List<JsonNode> albumNodes = extractResourcesByType(payload, Set.of("album"));
        if (albumNodes.isEmpty()) {
            return List.of();
        }

        List<MusicAlbumItem> albums = new ArrayList<>();
        LinkedHashSet<String> seen = new LinkedHashSet<>();
        for (JsonNode node : albumNodes) {
            String id = text(node, "id");
            JsonNode attributes = node.path("attributes");
            String name = firstNonBlank(text(attributes, "name"), text(attributes, "albumName"));
            if (name == null || name.isBlank()) {
                continue;
            }
            String key = id != null && !id.isBlank() ? id : normalize(name);
            if (!seen.add(key)) {
                continue;
            }
            String artistName = firstNonBlank(text(attributes, "artistName"), "");
            albums.add(new MusicAlbumItem(
                    id,
                    name,
                    artistName,
                    extractArtworkUrl(attributes.path("artwork"))
            ));
            if (albums.size() >= limit) {
                break;
            }
        }
        return albums;
    }

    private Map<String, JsonNode> buildResourceMap(Collection<JsonNode> nodes) {
        Map<String, JsonNode> map = new LinkedHashMap<>();
        for (JsonNode node : nodes) {
            String id = text(node, "id");
            String type = text(node, "type");
            if (id == null || type == null) {
                continue;
            }
            map.putIfAbsent(type.toLowerCase(Locale.ROOT) + "::" + id, node);
        }
        return map;
    }

    private List<MusicArtistRef> parseTrackArtists(JsonNode trackNode, Map<String, JsonNode> resourceMap, JsonNode attributes) {
        List<MusicArtistRef> artists = new ArrayList<>();
        JsonNode data = trackNode.path("relationships").path("artists").path("data");
        if (data.isArray()) {
            for (JsonNode entry : data) {
                String id = text(entry, "id");
                String type = normalizeType(text(entry, "type"), "artists");
                JsonNode resource = resourceMap.get(type + "::" + id);
                String name = resource != null ? text(resource.path("attributes"), "name") : null;
                if (name != null && !name.isBlank()) {
                    artists.add(new MusicArtistRef(id, name));
                }
            }
        }

        if (artists.isEmpty()) {
            String artistName = firstNonBlank(text(attributes, "artistName"), "");
            if (!artistName.isBlank()) {
                artists.add(new MusicArtistRef(null, artistName));
            }
        }
        return artists;
    }

    private MusicAlbumRef parseTrackAlbum(JsonNode trackNode, Map<String, JsonNode> resourceMap, JsonNode attributes) {
        JsonNode relationships = trackNode.path("relationships").path("albums").path("data");
        if (relationships.isArray() && !relationships.isEmpty()) {
            JsonNode first = relationships.get(0);
            String id = text(first, "id");
            String type = normalizeType(text(first, "type"), "albums");
            JsonNode album = resourceMap.get(type + "::" + id);
            if (album != null) {
                JsonNode albumAttributes = album.path("attributes");
                return new MusicAlbumRef(
                        id,
                        firstNonBlank(text(albumAttributes, "name"), text(attributes, "albumName")),
                        extractArtworkUrl(albumAttributes.path("artwork"))
                );
            }
            return new MusicAlbumRef(id, text(attributes, "albumName"), extractArtworkUrl(attributes.path("artwork")));
        }
        return new MusicAlbumRef(null, text(attributes, "albumName"), extractArtworkUrl(attributes.path("artwork")));
    }

    private List<JsonNode> extractResourcesByType(String payload, Set<String> typeHints) {
        if (payload == null || payload.isBlank()) {
            return List.of();
        }
        try {
            JsonNode root = objectMapper.readTree(payload);
            List<JsonNode> all = new ArrayList<>();
            collectResourceNodes(root, all);
            if (all.isEmpty()) {
                return List.of();
            }
            LinkedHashMap<String, JsonNode> dedup = new LinkedHashMap<>();
            for (JsonNode node : all) {
                String type = text(node, "type");
                if (type == null) {
                    continue;
                }
                String lowered = type.toLowerCase(Locale.ROOT);
                boolean match = typeHints.stream().anyMatch(lowered::contains);
                if (!match) {
                    continue;
                }
                String id = text(node, "id");
                String key = lowered + "::" + (id != null ? id : normalize(text(node.path("attributes"), "name")));
                dedup.putIfAbsent(key, node);
            }
            return new ArrayList<>(dedup.values());
        } catch (Exception e) {
            Log.debug("Unable to parse Apple Music payload for resource extraction", e);
            return List.of();
        }
    }

    private void collectResourceNodes(JsonNode node, List<JsonNode> out) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return;
        }
        ArrayDeque<JsonNode> stack = new ArrayDeque<>();
        stack.push(node);
        while (!stack.isEmpty()) {
            JsonNode current = stack.pop();
            if (current.isObject()) {
                boolean candidate = current.hasNonNull("id")
                        && current.hasNonNull("type")
                        && current.has("attributes");
                if (candidate) {
                    out.add(current);
                }
                current.elements().forEachRemaining(stack::push);
            } else if (current.isArray()) {
                current.elements().forEachRemaining(stack::push);
            }
        }
    }

    private MusicTrackResDto toTrackDto(MusicTrackItem item) {
        String artistName = "";
        if (item.artists() != null && !item.artists().isEmpty() && item.artists().getFirst() != null) {
            artistName = firstNonBlank(item.artists().getFirst().name(), "");
        }
        String coverUrl = item.album() != null ? item.album().coverUrl() : null;
        return new MusicTrackResDto(item.name(), artistName, coverUrl);
    }

    private String normalizeType(String type, String defaultType) {
        if (type == null || type.isBlank()) {
            return defaultType;
        }
        return type.toLowerCase(Locale.ROOT);
    }

    private String extractArtworkUrl(JsonNode artwork) {
        if (artwork == null || artwork.isMissingNode() || artwork.isNull()) {
            return null;
        }
        String raw = text(artwork, "url");
        if (raw == null || raw.isBlank()) {
            return null;
        }
        int width = intOrDefault(artwork, "width", 300);
        int height = intOrDefault(artwork, "height", 300);
        return raw.replace("{w}", String.valueOf(width))
                .replace("{h}", String.valueOf(height))
                .replace("{f}", "jpg");
    }

    private int intOrDefault(JsonNode node, String fieldName, int defaultValue) {
        JsonNode value = node.path(fieldName);
        return value.canConvertToInt() ? value.intValue() : defaultValue;
    }

    private Integer integer(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        return value.canConvertToInt() ? value.intValue() : null;
    }

    private List<String> parseStringArray(JsonNode node) {
        if (node == null || !node.isArray()) {
            return List.of();
        }
        List<String> values = new ArrayList<>();
        for (JsonNode item : node) {
            if (item.isTextual() && !item.asText().isBlank()) {
                values.add(item.asText().trim());
            }
        }
        return values;
    }

    private String text(JsonNode node, String fieldName) {
        if (node == null) {
            return null;
        }
        JsonNode value = node.path(fieldName);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }
        String text = value.asText();
        return text == null || text.isBlank() ? null : text.trim();
    }

    private String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first;
        }
        if (second != null && !second.isBlank()) {
            return second;
        }
        return null;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String requireToken(String token) {
        if (token == null || token.isBlank()) {
            throw new BadRequestException("musicUserToken is required");
        }
        return token.trim();
    }

    private static final class ArtistAccumulator {
        private final String id;
        private final String name;
        private final String imageUrl;
        private double score;

        private ArtistAccumulator(String id, String name, String imageUrl) {
            this.id = id;
            this.name = name;
            this.imageUrl = imageUrl;
        }
    }

    private static final class AlbumAccumulator {
        private final String id;
        private final String name;
        private final String artistName;
        private final String coverUrl;
        private double score;

        private AlbumAccumulator(String id, String name, String artistName, String coverUrl) {
            this.id = id;
            this.name = name;
            this.artistName = artistName;
            this.coverUrl = coverUrl;
        }
    }

    private record FallbackTracks(String payload, List<MusicTrackItem> tracks) {
    }

    public record DiscoveryPayload(
            String artistsPayload,
            String tracksPayload,
            List<MusicArtistItem> artists,
            List<MusicTrackItem> tracks
    ) {
    }

    public record TopArtistsData(String payload, List<MusicArtistItem> items) {
    }

    public record TopTracksData(String payload, List<MusicTrackItem> items) {
    }

    public record TopAlbumsData(String payload, List<MusicAlbumItem> items) {
    }

    public record MusicArtistItem(
            String id,
            String name,
            List<String> genres,
            Integer popularity,
            String imageUrl
    ) {
    }

    public record MusicArtistRef(String id, String name) {
    }

    public record MusicAlbumRef(String id, String name, String coverUrl) {
    }

    public record MusicAlbumItem(String id, String name, String artistName, String coverUrl) {
    }

    public record MusicTrackItem(
            String id,
            String name,
            Integer popularity,
            String isrc,
            List<MusicArtistRef> artists,
            MusicAlbumRef album
    ) {
    }
}
