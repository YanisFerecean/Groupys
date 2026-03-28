package com.groupys.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MusicIdentityUtilTest {

    @Test
    void syntheticArtistIdIsStableAndNegative() {
        long first = MusicIdentityUtil.syntheticArtistId("spotify-artist-1", "Artist One");
        long second = MusicIdentityUtil.syntheticArtistId("spotify-artist-1", "Artist One");

        assertEquals(first, second);
        assertTrue(first < 0);
    }

    @Test
    void syntheticTrackIdVariesByIdentity() {
        long first = MusicIdentityUtil.syntheticTrackId("spotify-track-1", "Track One", "Artist One");
        long second = MusicIdentityUtil.syntheticTrackId("spotify-track-2", "Track One", "Artist One");

        assertNotEquals(first, second);
    }
}
