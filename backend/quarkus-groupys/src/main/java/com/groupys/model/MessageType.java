package com.groupys.model;

import java.util.Set;

/**
 * Canonical set of chat message types. Stored on {@link Message#messageType} as a
 * lowercase-or-uppercase string; validated against {@link #isValid(String)} on send.
 *
 * <p>Kept as a constant set (not a hard JPA enum) so unknown future types coming from a
 * newer client degrade gracefully rather than failing persistence.
 */
public final class MessageType {

    public static final String TEXT = "TEXT";
    public static final String TRACK = "TRACK";
    public static final String ALBUM = "ALBUM";
    public static final String PLAYLIST = "PLAYLIST";
    public static final String LYRIC = "LYRIC";
    public static final String TIMESTAMP = "TIMESTAMP";
    public static final String DEDICATION = "DEDICATION";
    public static final String VOICE = "VOICE";
    public static final String STICKER = "STICKER";
    public static final String NOW_PLAYING_SHARE = "NOW_PLAYING_SHARE";
    public static final String TASTE_HANDSHAKE = "TASTE_HANDSHAKE";
    public static final String BLIND_LISTEN = "BLIND_LISTEN";
    public static final String SYSTEM = "SYSTEM";

    private static final Set<String> ALLOWED = Set.of(
            TEXT, TRACK, ALBUM, PLAYLIST, LYRIC, TIMESTAMP, DEDICATION,
            VOICE, STICKER, NOW_PLAYING_SHARE, TASTE_HANDSHAKE, BLIND_LISTEN, SYSTEM
    );

    private MessageType() {}

    /** Normalises a raw type to the canonical form, defaulting to {@link #TEXT} when null/blank. */
    public static String normalize(String raw) {
        if (raw == null || raw.isBlank()) {
            return TEXT;
        }
        return raw.trim().toUpperCase();
    }

    public static boolean isValid(String raw) {
        return raw != null && ALLOWED.contains(raw.trim().toUpperCase());
    }

    /** True for everything except plain text — i.e. payload-bearing card types. */
    public static boolean isStructured(String raw) {
        String t = normalize(raw);
        return !TEXT.equals(t);
    }
}
