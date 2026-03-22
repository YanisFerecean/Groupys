package com.groupys.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.groupys.client.SpotifyApiClient;
import com.groupys.client.SpotifyAuthClient;
import com.groupys.dto.SpotifyAlbumResDto;
import com.groupys.dto.SpotifyArtistResDto;
import com.groupys.dto.SpotifyTrackResDto;
import com.groupys.dto.spotify.SpotifyCurrentlyPlayingResponse;
import com.groupys.dto.spotify.SpotifyTokenResponse;
import com.groupys.dto.spotify.SpotifyTopArtistsResponse;
import com.groupys.dto.spotify.SpotifyTopTracksResponse;
import com.groupys.model.User;
import com.groupys.repository.UserRepository;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.rest.client.inject.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.List;

@ApplicationScoped
public class SpotifyService {

    private static final String SCOPES = "user-top-read user-read-currently-playing";

    @Inject
    UserRepository userRepository;

    @RestClient
    SpotifyApiClient spotifyApi;

    @RestClient
    SpotifyAuthClient spotifyAuth;

    @ConfigProperty(name = "spotify.client.id")
    String clientId;

    @ConfigProperty(name = "spotify.client.secret")
    String clientSecret;

    @ConfigProperty(name = "spotify.redirect.uri")
    String redirectUri;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public String buildAuthorizationUrl(String clerkId) {
        return "https://accounts.spotify.com/authorize"
                + "?client_id=" + enc(clientId)
                + "&response_type=code"
                + "&redirect_uri=" + enc(redirectUri)
                + "&scope=" + enc(SCOPES)
                + "&state=" + enc(clerkId);
    }

    @Transactional
    public void handleCallback(String code, String clerkId) {
        String basicAuth = "Basic " + Base64.getEncoder().encodeToString(
                (clientId + ":" + clientSecret).getBytes(StandardCharsets.UTF_8));

        SpotifyTokenResponse tokens = spotifyAuth.exchangeToken(
                "authorization_code", code, redirectUri, basicAuth);

        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        user.spotifyAccessToken = tokens.accessToken();
        user.spotifyRefreshToken = tokens.refreshToken();
        user.spotifyTokenExpiry = Instant.now().plusSeconds(tokens.expiresIn());
    }

    @Transactional
    public void disconnect(String clerkId) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        user.spotifyAccessToken = null;
        user.spotifyRefreshToken = null;
        user.spotifyTokenExpiry = null;
    }

    public List<SpotifyArtistResDto> getTopArtists(String clerkId) {
        String token = ensureValidToken(clerkId);
        try {
            Response response = spotifyApi.getTopArtists("Bearer " + token, 3, "medium_term");
            if (response.getStatus() != 200) {
                Log.warnf("Spotify top-artists returned %d", response.getStatus());
                return List.of();
            }
            String body = response.readEntity(String.class);
            SpotifyTopArtistsResponse res = objectMapper.readValue(body, SpotifyTopArtistsResponse.class);
            if (res == null || res.items() == null) return List.of();
            return res.items().stream()
                    .map(a -> new SpotifyArtistResDto(
                            a.name(),
                            a.images() != null && !a.images().isEmpty() ? a.images().getFirst().url() : null))
                    .toList();
        } catch (Exception e) {
            Log.errorf(e, "Spotify top-artists error");
            return List.of();
        }
    }

    public List<SpotifyTrackResDto> getTopTracks(String clerkId) {
        return fetchTopTracks(clerkId, 3);
    }

    public List<SpotifyAlbumResDto> getTopAlbums(String clerkId) {
        String token = ensureValidToken(clerkId);
        try {
            Response response = spotifyApi.getTopTracks("Bearer " + token, 20, "medium_term");
            if (response.getStatus() != 200) {
                Log.warnf("Spotify top-albums returned %d", response.getStatus());
                return List.of();
            }
            String body = response.readEntity(String.class);
            SpotifyTopTracksResponse res = objectMapper.readValue(body, SpotifyTopTracksResponse.class);
            if (res == null || res.items() == null) return List.of();

            LinkedHashSet<String> seen = new LinkedHashSet<>();
            List<SpotifyAlbumResDto> albums = new ArrayList<>();
            for (var track : res.items()) {
                if (track.album() == null) continue;
                String albumName = track.album().name();
                if (albumName == null || !seen.add(albumName)) continue;

                String artist = track.artists() != null && !track.artists().isEmpty()
                        ? track.artists().getFirst().name() : "";
                String cover = track.album().images() != null && !track.album().images().isEmpty()
                        ? track.album().images().getFirst().url() : null;
                albums.add(new SpotifyAlbumResDto(albumName, artist, cover));
                if (albums.size() >= 3) break;
            }
            return albums;
        } catch (Exception e) {
            Log.errorf(e, "Spotify top-albums error");
            return List.of();
        }
    }

    public SpotifyTrackResDto getCurrentlyPlaying(String clerkId) {
        String token = ensureValidToken(clerkId);
        try {
            Response response = spotifyApi.getCurrentlyPlaying("Bearer " + token);
            if (response.getStatus() == 204 || response.getStatus() != 200) {
                return null;
            }
            String body = response.readEntity(String.class);
            SpotifyCurrentlyPlayingResponse data = objectMapper.readValue(
                    body, SpotifyCurrentlyPlayingResponse.class);
            if (data.item() == null) return null;

            var track = data.item();
            return new SpotifyTrackResDto(
                    track.name(),
                    track.artists() != null && !track.artists().isEmpty()
                            ? track.artists().getFirst().name() : "",
                    track.album() != null && track.album().images() != null && !track.album().images().isEmpty()
                            ? track.album().images().getFirst().url() : null);
        } catch (Exception e) {
            Log.errorf(e, "Spotify currently-playing error");
            return null;
        }
    }

    private List<SpotifyTrackResDto> fetchTopTracks(String clerkId, int limit) {
        String token = ensureValidToken(clerkId);
        try {
            Response response = spotifyApi.getTopTracks("Bearer " + token, limit, "medium_term");
            if (response.getStatus() != 200) {
                Log.warnf("Spotify top-tracks returned %d", response.getStatus());
                return List.of();
            }
            String body = response.readEntity(String.class);
            SpotifyTopTracksResponse res = objectMapper.readValue(body, SpotifyTopTracksResponse.class);
            if (res == null || res.items() == null) return List.of();
            return res.items().stream()
                    .map(t -> new SpotifyTrackResDto(
                            t.name(),
                            t.artists() != null && !t.artists().isEmpty() ? t.artists().getFirst().name() : "",
                            t.album() != null && t.album().images() != null && !t.album().images().isEmpty()
                                    ? t.album().images().getFirst().url() : null))
                    .toList();
        } catch (Exception e) {
            Log.errorf(e, "Spotify top-tracks error");
            return List.of();
        }
    }

    private String ensureValidToken(String clerkId) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (user.spotifyRefreshToken == null) {
            throw new BadRequestException("Spotify not connected");
        }

        if (user.spotifyTokenExpiry != null
                && Instant.now().isAfter(user.spotifyTokenExpiry.minusSeconds(60))) {
            refreshToken(user);
        }

        return user.spotifyAccessToken;
    }

    @Transactional
    void refreshToken(User user) {
        try {
            String basicAuth = "Basic " + Base64.getEncoder().encodeToString(
                    (clientId + ":" + clientSecret).getBytes(StandardCharsets.UTF_8));

            SpotifyTokenResponse tokens = spotifyAuth.refreshToken(
                    "refresh_token", user.spotifyRefreshToken, basicAuth);

            user.spotifyAccessToken = tokens.accessToken();
            user.spotifyTokenExpiry = Instant.now().plusSeconds(tokens.expiresIn());

            if (tokens.refreshToken() != null) {
                user.spotifyRefreshToken = tokens.refreshToken();
            }
        } catch (Exception e) {
            throw new BadRequestException("Failed to refresh Spotify token: " + e.getMessage());
        }
    }

    private static String enc(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
