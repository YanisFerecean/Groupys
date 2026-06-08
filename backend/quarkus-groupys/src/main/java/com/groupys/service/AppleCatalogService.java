package com.groupys.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.groupys.client.AppleMusicApiClient;
import com.groupys.dto.apple.AppleCatalogAlbum;
import com.groupys.dto.apple.AppleCatalogArtist;
import com.groupys.dto.apple.AppleCatalogGenre;
import com.groupys.dto.apple.AppleCatalogSong;
import com.groupys.dto.apple.AppleChartsResult;
import com.groupys.dto.apple.AppleSearchResult;
import com.groupys.util.AppleStorefrontUtil;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.rest.client.inject.RestClient;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Supplier;

@ApplicationScoped
public class AppleCatalogService {

    private static final int MAX_RATE_LIMIT_RETRIES = 3;
    private static final long INITIAL_RETRY_BACKOFF_MS = 250L;
    private static final long MAX_RETRY_BACKOFF_MS = 8000L;
    private static final long MAX_RETRY_AFTER_MS = 30000L;

    @Inject
    @RestClient
    AppleMusicApiClient appleMusicApi;

    @Inject
    AppleDeveloperTokenService developerTokenService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public String resolveStorefront(String country) {
        return AppleStorefrontUtil.resolve(country);
    }

    public Optional<String> resolveStorefrontFromUserToken(String musicUserToken) {
        if (musicUserToken == null || musicUserToken.isBlank()) {
            return Optional.empty();
        }
        try (Response response = executeWithRetry(() -> appleMusicApi.getMyStorefront(bearer(), musicUserToken), "resolve storefront")) {
            if (response.getStatus() != 200) {
                return Optional.empty();
            }
            JsonNode root = objectMapper.readTree(response.readEntity(String.class));
            JsonNode data = root.path("data");
            if (data.isArray() && !data.isEmpty()) {
                String id = text(data.get(0), "id");
                if (id != null && !id.isBlank()) {
                    return Optional.of(id.toLowerCase());
                }
            }
            return Optional.empty();
        } catch (Exception e) {
            Log.warnf(e, "Apple storefront resolution failed");
            return Optional.empty();
        }
    }

    public AppleSearchResult search(String storefront, String term, int limit) {
        if (term == null || term.isBlank()) {
            return new AppleSearchResult(List.of(), List.of(), List.of());
        }
        try (Response response = executeWithRetry(
                () -> appleMusicApi.search(bearer(), storefront, term, "artists,albums,songs", sanitizeLimit(limit, 25)),
                "catalog search")) {
            if (response.getStatus() != 200) {
                return new AppleSearchResult(List.of(), List.of(), List.of());
            }
            JsonNode root = objectMapper.readTree(response.readEntity(String.class));
            JsonNode results = root.path("results");
            List<AppleCatalogArtist> artists = parseArtists(results.path("artists").path("data"));
            List<AppleCatalogAlbum> albums = parseAlbums(results.path("albums").path("data"), Map.of());
            List<AppleCatalogSong> songs = parseSongs(results.path("songs").path("data"), Map.of());
            return new AppleSearchResult(artists, albums, songs);
        } catch (Exception e) {
            Log.warnf(e, "Apple search failed term=%s", term);
            return new AppleSearchResult(List.of(), List.of(), List.of());
        }
    }

    public Optional<AppleCatalogArtist> getArtist(String storefront, String id) {
        try (Response response = executeWithRetry(
                () -> appleMusicApi.getArtist(bearer(), storefront, id, null),
                "catalog get artist")) {
            if (response.getStatus() != 200) {
                return Optional.empty();
            }
            JsonNode root = objectMapper.readTree(response.readEntity(String.class));
            JsonNode data = root.path("data");
            if (!data.isArray() || data.isEmpty()) {
                return Optional.empty();
            }
            return Optional.of(parseArtist(data.get(0)));
        } catch (Exception e) {
            Log.warnf(e, "Apple getArtist failed id=%s", id);
            return Optional.empty();
        }
    }

    public Optional<AppleCatalogAlbum> getAlbum(String storefront, String id) {
        try (Response response = executeWithRetry(
                () -> appleMusicApi.getAlbum(bearer(), storefront, id, "tracks"),
                "catalog get album")) {
            if (response.getStatus() != 200) {
                return Optional.empty();
            }
            JsonNode root = objectMapper.readTree(response.readEntity(String.class));
            JsonNode data = root.path("data");
            if (!data.isArray() || data.isEmpty()) {
                return Optional.empty();
            }
            return Optional.of(parseAlbum(data.get(0), buildIncludedMap(root.path("included"))));
        } catch (Exception e) {
            Log.warnf(e, "Apple getAlbum failed id=%s", id);
            return Optional.empty();
        }
    }

    public Optional<AppleCatalogSong> getSong(String storefront, String id) {
        try (Response response = executeWithRetry(
                () -> appleMusicApi.getSong(bearer(), storefront, id),
                "catalog get song")) {
            if (response.getStatus() != 200) {
                return Optional.empty();
            }
            JsonNode root = objectMapper.readTree(response.readEntity(String.class));
            JsonNode data = root.path("data");
            if (!data.isArray() || data.isEmpty()) {
                return Optional.empty();
            }
            return Optional.of(parseSong(data.get(0), Map.of()));
        } catch (Exception e) {
            Log.warnf(e, "Apple getSong failed id=%s", id);
            return Optional.empty();
        }
    }

    public List<AppleCatalogSong> getArtistTopSongs(String storefront, String id, int limit) {
        try (Response response = executeWithRetry(
                () -> appleMusicApi.getArtistTopSongs(bearer(), storefront, id, sanitizeLimit(limit, 25)),
                "catalog artist top songs")) {
            if (response.getStatus() != 200) {
                return List.of();
            }
            JsonNode root = objectMapper.readTree(response.readEntity(String.class));
            return parseSongs(root.path("data"), Map.of());
        } catch (Exception e) {
            Log.warnf(e, "Apple artist top songs failed id=%s", id);
            return List.of();
        }
    }

    public AppleChartsResult getCharts(String storefront, String genreId, int limit) {
        try (Response response = executeWithRetry(
                () -> appleMusicApi.getCharts(bearer(), storefront, "songs,albums", genreId, sanitizeLimit(limit, 25)),
                "catalog charts")) {
            if (response.getStatus() != 200) {
                return new AppleChartsResult(List.of(), List.of(), List.of());
            }
            JsonNode root = objectMapper.readTree(response.readEntity(String.class));
            JsonNode results = root.path("results");
            List<AppleCatalogSong> songs = parseChartGroup(results.path("songs"), n -> parseSong(n, Map.of()));
            List<AppleCatalogAlbum> albums = parseChartGroup(results.path("albums"), n -> parseAlbum(n, Map.of()));
            return new AppleChartsResult(List.of(), songs, albums);
        } catch (Exception e) {
            Log.warnf(e, "Apple charts failed storefront=%s", storefront);
            return new AppleChartsResult(List.of(), List.of(), List.of());
        }
    }

    public List<AppleCatalogGenre> getGenres(String storefront) {
        try (Response response = executeWithRetry(
                () -> appleMusicApi.getGenres(bearer(), storefront),
                "catalog genres")) {
            if (response.getStatus() != 200) {
                return List.of();
            }
            JsonNode root = objectMapper.readTree(response.readEntity(String.class));
            JsonNode data = root.path("data");
            if (!data.isArray()) {
                return List.of();
            }
            List<AppleCatalogGenre> genres = new ArrayList<>();
            for (JsonNode node : data) {
                JsonNode attrs = node.path("attributes");
                String id = text(node, "id");
                String name = text(attrs, "name");
                if (id == null || name == null) {
                    continue;
                }
                genres.add(new AppleCatalogGenre(id, name, text(attrs, "parentId"), text(attrs, "parentName")));
            }
            return genres;
        } catch (Exception e) {
            Log.warnf(e, "Apple genres failed storefront=%s", storefront);
            return List.of();
        }
    }

    private <T> List<T> parseChartGroup(JsonNode group, java.util.function.Function<JsonNode, T> mapper) {
        if (!group.isArray() || group.isEmpty()) {
            return List.of();
        }
        List<T> out = new ArrayList<>();
        JsonNode first = group.get(0);
        JsonNode data = first.path("data");
        if (data.isArray()) {
            for (JsonNode entry : data) {
                out.add(mapper.apply(entry));
            }
        }
        return out;
    }

    private List<AppleCatalogArtist> parseArtists(JsonNode arrayNode) {
        if (!arrayNode.isArray()) {
            return List.of();
        }
        List<AppleCatalogArtist> out = new ArrayList<>();
        for (JsonNode node : arrayNode) {
            out.add(parseArtist(node));
        }
        return out;
    }

    private List<AppleCatalogAlbum> parseAlbums(JsonNode arrayNode, Map<String, JsonNode> included) {
        if (!arrayNode.isArray()) {
            return List.of();
        }
        List<AppleCatalogAlbum> out = new ArrayList<>();
        for (JsonNode node : arrayNode) {
            out.add(parseAlbum(node, included));
        }
        return out;
    }

    private List<AppleCatalogSong> parseSongs(JsonNode arrayNode, Map<String, JsonNode> included) {
        if (!arrayNode.isArray()) {
            return List.of();
        }
        List<AppleCatalogSong> out = new ArrayList<>();
        for (JsonNode node : arrayNode) {
            out.add(parseSong(node, included));
        }
        return out;
    }

    private AppleCatalogArtist parseArtist(JsonNode node) {
        JsonNode attrs = node.path("attributes");
        JsonNode artwork = attrs.path("artwork");
        JsonNode notes = attrs.path("editorialNotes");
        return new AppleCatalogArtist(
                text(node, "id"),
                text(attrs, "name"),
                parseStringArray(attrs.path("genreNames")),
                text(artwork, "url"),
                artwork.path("width").isInt() ? artwork.path("width").intValue() : null,
                artwork.path("height").isInt() ? artwork.path("height").intValue() : null,
                text(notes, "short"),
                text(notes, "standard")
        );
    }

    private AppleCatalogAlbum parseAlbum(JsonNode node, Map<String, JsonNode> included) {
        JsonNode attrs = node.path("attributes");
        JsonNode artwork = attrs.path("artwork");
        String artworkTemplate = text(artwork, "url");
        Integer artworkWidth = artwork.path("width").isInt() ? artwork.path("width").intValue() : null;
        Integer artworkHeight = artwork.path("height").isInt() ? artwork.path("height").intValue() : null;
        String firstArtistId = null;
        JsonNode artistData = node.path("relationships").path("artists").path("data");
        if (artistData.isArray() && !artistData.isEmpty()) {
            firstArtistId = text(artistData.get(0), "id");
        }
        List<AppleCatalogSong> tracks = new ArrayList<>();
        JsonNode trackData = node.path("relationships").path("tracks").path("data");
        if (trackData.isArray()) {
            for (JsonNode ref : trackData) {
                // Album track relationships are returned inline with their attributes;
                // fall back to the top-level included map for reference-only payloads.
                JsonNode resolved = ref.hasNonNull("attributes")
                        ? ref
                        : included.get(text(ref, "type") + ":" + text(ref, "id"));
                if (resolved != null) {
                    tracks.add(parseSong(resolved, included));
                }
            }
        }
        return new AppleCatalogAlbum(
                text(node, "id"),
                text(attrs, "name"),
                text(attrs, "artistName"),
                firstArtistId,
                artworkTemplate,
                artworkWidth,
                artworkHeight,
                text(attrs, "releaseDate"),
                text(attrs, "recordLabel"),
                attrs.path("trackCount").isInt() ? attrs.path("trackCount").intValue() : null,
                parseStringArray(attrs.path("genreNames")),
                tracks
        );
    }

    private AppleCatalogSong parseSong(JsonNode node, Map<String, JsonNode> included) {
        JsonNode attrs = node.path("attributes");
        JsonNode artwork = attrs.path("artwork");
        String previewUrl = null;
        JsonNode previews = attrs.path("previews");
        if (previews.isArray() && !previews.isEmpty()) {
            previewUrl = text(previews.get(0), "url");
        }
        String albumId = null;
        JsonNode albumData = node.path("relationships").path("albums").path("data");
        if (albumData.isArray() && !albumData.isEmpty()) {
            albumId = text(albumData.get(0), "id");
        }
        String artistId = null;
        JsonNode artistData = node.path("relationships").path("artists").path("data");
        if (artistData.isArray() && !artistData.isEmpty()) {
            artistId = text(artistData.get(0), "id");
        }
        return new AppleCatalogSong(
                text(node, "id"),
                text(attrs, "name"),
                text(attrs, "artistName"),
                artistId,
                text(attrs, "albumName"),
                albumId,
                previewUrl,
                attrs.path("durationInMillis").isInt() ? attrs.path("durationInMillis").intValue() : null,
                text(artwork, "url"),
                artwork.path("width").isInt() ? artwork.path("width").intValue() : null,
                artwork.path("height").isInt() ? artwork.path("height").intValue() : null,
                parseStringArray(attrs.path("genreNames")),
                attrs.path("trackNumber").isInt() ? attrs.path("trackNumber").intValue() : null,
                text(attrs, "isrc")
        );
    }

    private Map<String, JsonNode> buildIncludedMap(JsonNode included) {
        if (!included.isArray()) {
            return Map.of();
        }
        Map<String, JsonNode> map = new HashMap<>();
        for (JsonNode node : included) {
            String type = text(node, "type");
            String id = text(node, "id");
            if (type != null && id != null) {
                map.put(type + ":" + id, node);
            }
        }
        return map;
    }

    private String bearer() {
        return "Bearer " + developerTokenService.getDeveloperToken();
    }

    private int sanitizeLimit(int limit, int defaultLimit) {
        if (limit <= 0) {
            return defaultLimit;
        }
        return Math.min(limit, 25);
    }

    private Response executeWithRetry(Supplier<Response> call, String operation) {
        long backoffMs = INITIAL_RETRY_BACKOFF_MS;
        for (int attempt = 1; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
            Response response;
            try {
                response = call.get();
            } catch (WebApplicationException e) {
                response = e.getResponse();
            }
            if (response == null) {
                throw new IllegalStateException("Apple Music returned null response for " + operation);
            }
            if (response.getStatus() != 429 || attempt == MAX_RATE_LIMIT_RETRIES) {
                return response;
            }
            long retryAfterMs = parseRetryAfterMs(response.getHeaderString("Retry-After"));
            response.close();
            long jitter = ThreadLocalRandom.current().nextLong(50L, 150L);
            long sleepMs = (retryAfterMs > 0 ? retryAfterMs : backoffMs) + jitter;
            Log.warnf("Apple Music rate limited (429) on %s, attempt %d/%d, sleeping %dms",
                    operation, attempt, MAX_RATE_LIMIT_RETRIES, sleepMs);
            try {
                Thread.sleep(sleepMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Interrupted while retrying Apple Music call: " + operation, e);
            }
            backoffMs = Math.min(backoffMs * 2L, MAX_RETRY_BACKOFF_MS);
        }
        throw new IllegalStateException("Unexpected retry loop exit for " + operation);
    }

    private long parseRetryAfterMs(String retryAfter) {
        if (retryAfter == null || retryAfter.isBlank()) {
            return -1L;
        }
        try {
            long seconds = Long.parseLong(retryAfter.trim());
            return Math.min(Math.max(seconds, 0L) * 1000L, MAX_RETRY_AFTER_MS);
        } catch (NumberFormatException ignored) {
            // HTTP-date form is rare from Apple; fall back to exponential backoff.
            return -1L;
        }
    }

    private static String text(JsonNode node, String fieldName) {
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

    private static List<String> parseStringArray(JsonNode node) {
        if (!node.isArray()) {
            return Collections.emptyList();
        }
        List<String> out = new ArrayList<>();
        for (JsonNode item : node) {
            if (item.isTextual() && !item.asText().isBlank()) {
                out.add(item.asText().trim());
            }
        }
        return out;
    }
}
