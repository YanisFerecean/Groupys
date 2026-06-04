package com.groupys.resource;

import com.groupys.dto.DiscoverySyncResDto;
import com.groupys.dto.MusicAlbumResDto;
import com.groupys.dto.MusicArtistResDto;
import com.groupys.dto.MusicConnectReqDto;
import com.groupys.dto.MusicDeveloperTokenResDto;
import com.groupys.dto.MusicTrackResDto;
import com.groupys.service.DiscoveryService;
import com.groupys.service.MusicService;
import jakarta.enterprise.inject.Vetoed;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MusicResourceTest {

    private static final String CLERK_ID = "user_clerk_abc";

    @Test
    void developerTokenReturnsPayloadFromService() {
        MusicResource resource = resourceWith(new StubMusicService() {
            @Override
            public MusicDeveloperTokenResDto getDeveloperToken() {
                return new MusicDeveloperTokenResDto("dev-token", 1700000000L);
            }
        }, new StubDiscoveryService());

        MusicDeveloperTokenResDto dto = resource.developerToken();

        assertEquals("dev-token", dto.token());
        assertEquals(1700000000L, dto.expiresAtEpochSeconds());
    }

    @Test
    void connectStoresMusicUserTokenAndReturnsDiscoverySync() {
        AtomicReference<String> captured = new AtomicReference<>();
        StubMusicService musicService = new StubMusicService() {
            @Override
            public void connect(String clerkId, String musicUserToken) {
                captured.set(clerkId + ":" + musicUserToken);
            }
        };
        DiscoverySyncResDto sync = new DiscoverySyncResDto(3, 4, 5, 6, Instant.ofEpochSecond(1700000000L));
        StubDiscoveryService discovery = new StubDiscoveryService() {
            @Override
            public DiscoverySyncResDto syncMusic(String clerkId) {
                return sync;
            }
        };

        MusicResource resource = resourceWith(musicService, discovery);

        DiscoverySyncResDto result = resource.connect(new MusicConnectReqDto("music-user-token"));

        assertEquals(CLERK_ID + ":music-user-token", captured.get());
        assertEquals(sync, result);
    }

    @Test
    void disconnectReturnsNoContent() {
        AtomicBoolean called = new AtomicBoolean(false);
        MusicResource resource = resourceWith(new StubMusicService() {
            @Override
            public void disconnect(String clerkId) {
                if (CLERK_ID.equals(clerkId)) {
                    called.set(true);
                }
            }
        }, new StubDiscoveryService());

        Response response = resource.disconnect();

        assertEquals(204, response.getStatus());
        assertTrue(called.get());
    }

    @Test
    void topArtistsDelegatesToMusicService() {
        List<MusicArtistResDto> fixture = List.of(
                new MusicArtistResDto("Phoenix", "img-1"),
                new MusicArtistResDto("Tame Impala", "img-2")
        );
        MusicResource resource = resourceWith(new StubMusicService() {
            @Override
            public List<MusicArtistResDto> getTopArtists(String clerkId) {
                return fixture;
            }
        }, new StubDiscoveryService());

        List<MusicArtistResDto> result = resource.topArtists();

        assertEquals(fixture, result);
    }

    @Test
    void topTracksDelegatesToMusicService() {
        List<MusicTrackResDto> fixture = List.of(
                new MusicTrackResDto("Lisztomania", "Phoenix", "cover-1")
        );
        MusicResource resource = resourceWith(new StubMusicService() {
            @Override
            public List<MusicTrackResDto> getTopTracks(String clerkId) {
                return fixture;
            }
        }, new StubDiscoveryService());

        assertEquals(fixture, resource.topTracks());
    }

    @Test
    void topAlbumsDelegatesToMusicService() {
        List<MusicAlbumResDto> fixture = List.of(
                new MusicAlbumResDto("apple-album-1", "Wolfgang Amadeus Phoenix", "Phoenix", "cover-1")
        );
        MusicResource resource = resourceWith(new StubMusicService() {
            @Override
            public List<MusicAlbumResDto> getTopAlbums(String clerkId) {
                return fixture;
            }
        }, new StubDiscoveryService());

        assertEquals(fixture, resource.topAlbums());
    }

    @Test
    void currentlyPlayingReturns200WhenTrackPresent() {
        MusicTrackResDto track = new MusicTrackResDto("1901", "Phoenix", "cover");
        MusicResource resource = resourceWith(new StubMusicService() {
            @Override
            public MusicTrackResDto getCurrentlyPlaying(String clerkId) {
                return track;
            }
        }, new StubDiscoveryService());

        Response response = resource.currentlyPlaying();

        assertEquals(200, response.getStatus());
        assertEquals(track, response.getEntity());
    }

    @Test
    void currentlyPlayingReturns204WhenNoTrack() {
        MusicResource resource = resourceWith(new StubMusicService() {
            @Override
            public MusicTrackResDto getCurrentlyPlaying(String clerkId) {
                return null;
            }
        }, new StubDiscoveryService());

        Response response = resource.currentlyPlaying();

        assertEquals(204, response.getStatus());
        assertNull(response.getEntity());
    }

    @Test
    void topArtistsByUserDelegatesToMusicService() {
        List<MusicArtistResDto> fixture = List.of(new MusicArtistResDto("Phoenix", "img-1"));
        AtomicReference<String> seenUserId = new AtomicReference<>();
        MusicResource resource = resourceWith(new StubMusicService() {
            @Override
            public List<MusicArtistResDto> getTopArtistsByUserId(String userId) {
                seenUserId.set(userId);
                return fixture;
            }
        }, new StubDiscoveryService());

        List<MusicArtistResDto> result = resource.topArtistsByUser("other-user-id");

        assertEquals(fixture, result);
        assertEquals("other-user-id", seenUserId.get());
    }

    private MusicResource resourceWith(MusicService musicService, DiscoveryService discoveryService) {
        MusicResource resource = new MusicResource();
        resource.musicService = musicService;
        resource.discoveryService = discoveryService;
        resource.jwt = new TestJwt(CLERK_ID);
        return resource;
    }

    @Vetoed
    private static class StubMusicService extends MusicService {
        @Override
        public MusicDeveloperTokenResDto getDeveloperToken() {
            return new MusicDeveloperTokenResDto("stub", 0L);
        }

        @Override
        public void connect(String clerkId, String musicUserToken) {
        }

        @Override
        public void disconnect(String clerkId) {
        }

        @Override
        public List<MusicArtistResDto> getTopArtists(String clerkId) {
            return List.of();
        }

        @Override
        public List<MusicArtistResDto> getTopArtistsByUserId(String userId) {
            return List.of();
        }

        @Override
        public List<MusicTrackResDto> getTopTracks(String clerkId) {
            return List.of();
        }

        @Override
        public List<MusicTrackResDto> getTopTracksByUserId(String userId) {
            return List.of();
        }

        @Override
        public List<MusicAlbumResDto> getTopAlbums(String clerkId) {
            return List.of();
        }

        @Override
        public List<MusicAlbumResDto> getTopAlbumsByUserId(String userId) {
            return List.of();
        }

        @Override
        public MusicTrackResDto getCurrentlyPlaying(String clerkId) {
            return null;
        }

        @Override
        public MusicTrackResDto getCurrentlyPlayingByUserId(String userId) {
            return null;
        }
    }

    @Vetoed
    private static class StubDiscoveryService extends DiscoveryService {
        @Override
        public DiscoverySyncResDto syncMusic(String clerkId) {
            return new DiscoverySyncResDto(0, 0, 0, 0, Instant.EPOCH);
        }
    }

    private static class TestJwt implements JsonWebToken {
        private final String subject;

        TestJwt(String subject) {
            this.subject = subject;
        }

        @Override
        public String getName() {
            return subject;
        }

        @Override
        public Set<String> getClaimNames() {
            return new HashSet<>();
        }

        @Override
        @SuppressWarnings("unchecked")
        public <T> T getClaim(String claimName) {
            if ("sub".equals(claimName)) {
                return (T) subject;
            }
            return null;
        }

        @Override
        public String getSubject() {
            return subject;
        }
    }
}
