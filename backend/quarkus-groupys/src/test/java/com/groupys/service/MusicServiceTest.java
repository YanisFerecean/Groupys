package com.groupys.service;

import com.groupys.client.AppleMusicApiClient;
import com.groupys.model.User;
import com.groupys.repository.UserRepository;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MusicServiceTest {

    @Test
    void connectPersistsMusicUserTokenWhenValidationSucceeds() {
        User user = user("clerk-connect-ok", "connect-ok");
        MusicService service = new MusicService();
        service.userRepository = new StubUserRepository(Map.of(user.clerkId, user));
        service.developerTokenService = new StubDeveloperTokenService();
        service.appleMusicApi = new StubAppleMusicApiClient(
                ResponseSpec.of(200, "{}"),
                ResponseSpec.of(404, "{}"),
                ResponseSpec.of(404, "{}"),
                ResponseSpec.of(404, "{}")
        );

        service.connect(user.clerkId, "music-user-token-value");

        assertEquals("music-user-token-value", user.appleMusicUserToken);
        assertNotNull(user.appleMusicConnectedAt);
    }

    @Test
    void connectRejectsForbiddenMusicToken() {
        User user = user("clerk-connect-forbidden", "connect-forbidden");
        MusicService service = new MusicService();
        service.userRepository = new StubUserRepository(Map.of(user.clerkId, user));
        service.developerTokenService = new StubDeveloperTokenService();
        service.appleMusicApi = new StubAppleMusicApiClient(
                ResponseSpec.of(403, "{}"),
                ResponseSpec.of(404, "{}"),
                ResponseSpec.of(404, "{}"),
                ResponseSpec.of(404, "{}")
        );

        WebApplicationException error =
                assertThrows(WebApplicationException.class, () -> service.connect(user.clerkId, "invalid-token"));
        assertEquals(403, error.getResponse().getStatus());
    }

    @Test
    void connectAllowsSimulatorMockTokenWhenEnabled() {
        User user = user("clerk-connect-simulator", "connect-simulator");
        MusicService service = new MusicService();
        service.userRepository = new StubUserRepository(Map.of(user.clerkId, user));
        service.simulatorMockEnabled = true;

        service.connect(user.clerkId, "simulator_mock_user_token");

        assertEquals("simulator_mock_user_token", user.appleMusicUserToken);
        assertNotNull(user.appleMusicConnectedAt);
    }

    @Test
    void topTracksReturnsSimulatorDataWhenMockTokenIsStored() {
        User user = user("clerk-toptracks-simulator", "toptracks-simulator");
        user.appleMusicUserToken = "simulator_mock_user_token";

        MusicService service = new MusicService();
        service.userRepository = new StubUserRepository(Map.of(user.clerkId, user));
        service.simulatorMockEnabled = true;

        assertEquals(3, service.getTopTracks(user.clerkId).size());
    }

    @Test
    void fetchDiscoveryPayloadUsesReplayDataWhenAvailable() {
        User user = user("clerk-discovery-replay", "discovery-replay");
        user.appleMusicUserToken = "music-user-token";

        MusicService service = new MusicService();
        service.userRepository = new StubUserRepository(Map.of(user.clerkId, user));
        service.developerTokenService = new StubDeveloperTokenService();
        service.appleMusicApi = new StubAppleMusicApiClient(
                ResponseSpec.of(200, "{}"),
                ResponseSpec.of(200, replayPayload()),
                ResponseSpec.of(404, "{}"),
                ResponseSpec.of(404, "{}")
        );

        MusicService.DiscoveryPayload payload = service.fetchDiscoveryPayload(user.clerkId, 10, 10);
        assertTrue(payload.artists().stream().anyMatch(artist -> "Artist One".equals(artist.name())));
        assertTrue(payload.tracks().stream().anyMatch(track -> "Song One".equals(track.name())));
    }

    @Test
    void fetchDiscoveryPayloadFallsBackToRecentTracksWhenReplayUnavailable() {
        User user = user("clerk-discovery-fallback", "discovery-fallback");
        user.appleMusicUserToken = "music-user-token";

        MusicService service = new MusicService();
        service.userRepository = new StubUserRepository(Map.of(user.clerkId, user));
        service.developerTokenService = new StubDeveloperTokenService();
        service.appleMusicApi = new StubAppleMusicApiClient(
                ResponseSpec.of(200, "{}"),
                ResponseSpec.of(404, "{}"),
                ResponseSpec.of(200, recentTracksPayload()),
                ResponseSpec.of(404, "{}")
        );

        MusicService.DiscoveryPayload payload = service.fetchDiscoveryPayload(user.clerkId, 10, 10);
        assertTrue(payload.tracks().stream().anyMatch(track -> "Recent Song".equals(track.name())));
        assertTrue(payload.artists().stream().anyMatch(artist -> "Recent Artist".equals(artist.name())));
    }

    @Test
    void topTracksAndAlbumsParseReplayViewsWhenTypesAreSummaryEntries() {
        User user = user("clerk-replay-views", "replay-views");
        user.appleMusicUserToken = "music-user-token";

        MusicService service = new MusicService();
        service.userRepository = new StubUserRepository(Map.of(user.clerkId, user));
        service.developerTokenService = new StubDeveloperTokenService();
        service.appleMusicApi = new StubAppleMusicApiClient(
                ResponseSpec.of(200, "{}"),
                ResponseSpec.of(200, replayViewsPayload()),
                ResponseSpec.of(404, "{}"),
                ResponseSpec.of(404, "{}")
        );

        assertTrue(service.getTopTracks(user.clerkId).stream().anyMatch(track -> "Song View One".equals(track.title())));
        assertTrue(service.getTopAlbums(user.clerkId).stream().anyMatch(album -> "Album View One".equals(album.title())));
    }

    @Test
    void topTracksParseReplayTopTracksViewUnderAttributes() {
        User user = user("clerk-replay-top-tracks", "replay-top-tracks");
        user.appleMusicUserToken = "music-user-token";

        MusicService service = new MusicService();
        service.userRepository = new StubUserRepository(Map.of(user.clerkId, user));
        service.developerTokenService = new StubDeveloperTokenService();
        service.appleMusicApi = new StubAppleMusicApiClient(
                ResponseSpec.of(200, "{}"),
                ResponseSpec.of(200, replayTopTracksViewPayload()),
                ResponseSpec.of(404, "{}"),
                ResponseSpec.of(404, "{}")
        );

        assertTrue(service.getTopTracks(user.clerkId).stream().anyMatch(track -> "Song Track One".equals(track.title())));
    }

    @Test
    void topTracksParseSparseReplayEntriesViaRelationships() {
        User user = user("clerk-replay-sparse-track", "replay-sparse-track");
        user.appleMusicUserToken = "music-user-token";

        MusicService service = new MusicService();
        service.userRepository = new StubUserRepository(Map.of(user.clerkId, user));
        service.developerTokenService = new StubDeveloperTokenService();
        service.appleMusicApi = new StubAppleMusicApiClient(
                ResponseSpec.of(200, "{}"),
                ResponseSpec.of(200, replaySparseTrackPayload()),
                ResponseSpec.of(404, "{}"),
                ResponseSpec.of(404, "{}")
        );

        assertTrue(service.getTopTracks(user.clerkId).stream().anyMatch(track -> "Sparse Song One".equals(track.title())));
    }

    @Test
    void topTracksReplayRequestPassesTopSongsView() {
        User user = user("clerk-replay-views-top-songs", "replay-views-top-songs");
        user.appleMusicUserToken = "music-user-token";

        MusicService service = new MusicService();
        service.userRepository = new StubUserRepository(Map.of(user.clerkId, user));
        service.developerTokenService = new StubDeveloperTokenService();
        StubAppleMusicApiClient appleMusicApi = new StubAppleMusicApiClient(
                ResponseSpec.of(200, "{}"),
                ResponseSpec.of(200, replayPayload()),
                ResponseSpec.of(404, "{}"),
                ResponseSpec.of(404, "{}")
        );
        service.appleMusicApi = appleMusicApi;

        service.getTopTracks(user.clerkId);

        assertEquals("top-songs", appleMusicApi.lastReplayViews());
    }

    private static User user(String seed, String suffix) {
        User user = new User();
        user.id = UUID.nameUUIDFromBytes(seed.getBytes(StandardCharsets.UTF_8));
        user.clerkId = "clerk-" + suffix;
        user.username = "user-" + suffix;
        user.displayName = "User " + suffix;
        return user;
    }

    private static String replayPayload() {
        return """
                {
                  "data": [
                    {
                      "id": "song-1",
                      "type": "songs",
                      "attributes": {
                        "name": "Song One",
                        "artistName": "Artist One",
                        "albumName": "Album One",
                        "isrc": "TESTISRC001",
                        "artwork": {
                          "url": "https://image.example/{w}x{h}.jpg",
                          "width": 300,
                          "height": 300
                        }
                      },
                      "relationships": {
                        "artists": {
                          "data": [
                            { "id": "artist-1", "type": "artists" }
                          ]
                        },
                        "albums": {
                          "data": [
                            { "id": "album-1", "type": "albums" }
                          ]
                        }
                      }
                    },
                    {
                      "id": "artist-1",
                      "type": "artists",
                      "attributes": {
                        "name": "Artist One",
                        "genreNames": ["Hip-Hop"],
                        "popularity": 92,
                        "artwork": {
                          "url": "https://artist.example/{w}x{h}.jpg",
                          "width": 400,
                          "height": 400
                        }
                      }
                    },
                    {
                      "id": "album-1",
                      "type": "albums",
                      "attributes": {
                        "name": "Album One",
                        "artistName": "Artist One",
                        "artwork": {
                          "url": "https://album.example/{w}x{h}.jpg",
                          "width": 500,
                          "height": 500
                        }
                      }
                    }
                  ]
                }
                """;
    }

    private static String recentTracksPayload() {
        return """
                {
                  "data": [
                    {
                      "id": "recent-song-1",
                      "type": "songs",
                      "attributes": {
                        "name": "Recent Song",
                        "artistName": "Recent Artist",
                        "albumName": "Recent Album",
                        "artwork": {
                          "url": "https://recent.example/{w}x{h}.jpg",
                          "width": 300,
                          "height": 300
                        }
                      }
                    }
                  ]
                }
                """;
    }

    private static String replayViewsPayload() {
        return """
                {
                  "data": [
                    {
                      "id": "year-latest",
                      "type": "music-summaries",
                      "views": {
                        "top-songs": {
                          "data": [
                            {
                              "id": "view-song-1",
                              "type": "summary-entry",
                              "attributes": {
                                "name": "Song View One",
                                "artistName": "Artist View One",
                                "albumName": "Album View One",
                                "artwork": {
                                  "url": "https://song-view.example/{w}x{h}.jpg",
                                  "width": 300,
                                  "height": 300
                                }
                              }
                            }
                          ]
                        },
                        "top-albums": {
                          "data": [
                            {
                              "id": "view-album-1",
                              "type": "summary-entry",
                              "attributes": {
                                "name": "Album View One",
                                "artistName": "Artist View One",
                                "artwork": {
                                  "url": "https://album-view.example/{w}x{h}.jpg",
                                  "width": 500,
                                  "height": 500
                                }
                              }
                            }
                          ]
                        }
                      }
                    }
                  ]
                }
                """;
    }

    private static String replayTopTracksViewPayload() {
        return """
                {
                  "data": [
                    {
                      "id": "year-latest",
                      "type": "music-summaries",
                      "attributes": {
                        "views": {
                          "top-tracks": {
                            "data": [
                              {
                                "id": "track-entry-1",
                                "type": "summary-entry",
                                "attributes": {
                                  "title": "Song Track One",
                                  "artistName": "Track Artist One",
                                  "albumName": "Track Album One",
                                  "artwork": {
                                    "url": "https://track-view.example/{w}x{h}.jpg",
                                    "width": 300,
                                    "height": 300
                                  }
                                }
                              }
                            ]
                          }
                        }
                      }
                    }
                  ]
                }
                """;
    }

    private static String replaySparseTrackPayload() {
        return """
                {
                  "data": [
                    {
                      "id": "year-latest",
                      "type": "music-summaries",
                      "views": {
                        "top-songs": {
                          "data": [
                            {
                              "id": "summary-song-entry-1",
                              "type": "summary-entry",
                              "relationships": {
                                "songs": {
                                  "data": [
                                    {
                                      "id": "sparse-song-1",
                                      "type": "songs"
                                    }
                                  ]
                                }
                              }
                            }
                          ]
                        }
                      },
                      "resources": {
                        "songs": [
                          {
                            "id": "sparse-song-1",
                            "type": "audio-item",
                            "attributes": {
                              "name": "Sparse Song One",
                              "artistName": "Sparse Artist One",
                              "albumName": "Sparse Album One",
                              "artwork": {
                                "url": "https://sparse-song.example/{w}x{h}.jpg",
                                "width": 320,
                                "height": 320
                              }
                            }
                          }
                        ]
                      }
                    }
                  ]
                }
                """;
    }

    private static final class StubDeveloperTokenService extends AppleDeveloperTokenService {
        @Override
        public synchronized String getDeveloperToken() {
            return "developer-token";
        }

        @Override
        public synchronized long getDeveloperTokenExpiryEpochSeconds() {
            return Instant.now().plusSeconds(300).getEpochSecond();
        }
    }

    private static final class StubUserRepository extends UserRepository {
        private final Map<String, User> usersByClerkId;

        private StubUserRepository(Map<String, User> usersByClerkId) {
            this.usersByClerkId = usersByClerkId;
        }

        @Override
        public Optional<User> findByClerkId(String clerkId) {
            return Optional.ofNullable(usersByClerkId.get(clerkId));
        }
    }

    private record ResponseSpec(int status, String payload) {
        private static ResponseSpec of(int status, String payload) {
            return new ResponseSpec(status, payload);
        }
    }

    private static final class StubAppleMusicApiClient implements AppleMusicApiClient {
        private final ResponseSpec storefront;
        private final ResponseSpec replay;
        private final ResponseSpec recent;
        private final ResponseSpec heavy;
        private String lastReplayViews;

        private StubAppleMusicApiClient(ResponseSpec storefront, ResponseSpec replay, ResponseSpec recent, ResponseSpec heavy) {
            this.storefront = storefront;
            this.replay = replay;
            this.recent = recent;
            this.heavy = heavy;
        }

        @Override
        public Response getMyStorefront(String bearer, String musicUserToken) {
            return Response.status(storefront.status()).entity(storefront.payload()).build();
        }

        @Override
        public Response getMusicSummaries(String bearer, String musicUserToken, String year, String views) {
            this.lastReplayViews = views;
            return Response.status(replay.status()).entity(replay.payload()).build();
        }

        @Override
        public Response getRecentlyPlayedTracks(String bearer, String musicUserToken, int limit) {
            return Response.status(recent.status()).entity(recent.payload()).build();
        }

        @Override
        public Response getHeavyRotation(String bearer, String musicUserToken, int limit) {
            return Response.status(heavy.status()).entity(heavy.payload()).build();
        }

        private String lastReplayViews() {
            return lastReplayViews;
        }
    }
}
