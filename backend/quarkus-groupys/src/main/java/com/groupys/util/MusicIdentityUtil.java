package com.groupys.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public final class MusicIdentityUtil {

    private MusicIdentityUtil() {
    }

    public static long syntheticArtistId(String appleMusicId, String artistName) {
        return stableNegativeLong("artist", appleMusicId != null ? appleMusicId : artistName);
    }

    public static long syntheticTrackId(String appleMusicId, String trackName, String primaryArtist) {
        String key = appleMusicId != null ? appleMusicId : trackName + "::" + primaryArtist;
        return stableNegativeLong("track", key);
    }

    private static long stableNegativeLong(String namespace, String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Stable identity value is required");
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest((namespace + ":" + value.trim().toLowerCase()).getBytes(StandardCharsets.UTF_8));
            long result = 0L;
            for (int i = 0; i < Long.BYTES; i++) {
                result = (result << 8) | (hash[i] & 0xffL);
            }
            result = Math.abs(result == Long.MIN_VALUE ? 1L : result);
            return -result;
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
