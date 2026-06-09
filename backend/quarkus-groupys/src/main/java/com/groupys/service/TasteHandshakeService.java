package com.groupys.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.groupys.model.Conversation;
import com.groupys.model.Message;
import com.groupys.model.MessageType;
import com.groupys.model.User;
import com.groupys.repository.MessageRepository;
import com.groupys.repository.UserArtistPreferenceRepository;
import com.groupys.repository.UserGenrePreferenceRepository;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Seeds a one-time taste-handshake icebreaker into a new match conversation (ticket 5.1).
 * Reads stored artist/genre preferences (no live Apple calls), computes the overlap, and inserts
 * a single {@code TASTE_HANDSHAKE} message. Idempotent per conversation.
 */
@ApplicationScoped
public class TasteHandshakeService {

    private static final int SCAN_LIMIT = 30;
    private static final int MAX_SHARED = 6;

    @Inject
    UserArtistPreferenceRepository artistPrefRepository;

    @Inject
    UserGenrePreferenceRepository genrePrefRepository;

    @Inject
    MessageRepository messageRepository;

    @Inject
    ObjectMapper objectMapper;

    /**
     * Insert the handshake card if one is not already present. Must run inside an active
     * transaction (callers are already {@code @Transactional}).
     */
    public void ensureForConversation(Conversation conversation, User a, User b) {
        if (conversation == null || a == null || b == null) {
            return;
        }
        try {
            if (messageRepository.existsByConversationAndType(conversation.id, MessageType.TASTE_HANDSHAKE)) {
                return;
            }

            List<String> sharedArtists = intersect(topArtistNames(a.id), topArtistNames(b.id));
            List<String> sharedGenres = intersect(topGenreNames(a.id), topGenreNames(b.id));
            double overlapScore = score(sharedArtists.size(), sharedGenres.size());

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("type", MessageType.TASTE_HANDSHAKE);
            payload.put("sharedArtists", sharedArtists);
            payload.put("sharedGenres", sharedGenres);
            payload.put("overlapScore", overlapScore);

            Message msg = new Message();
            msg.conversation = conversation;
            msg.sender = a; // sender is non-null; the renderer presents it as a neutral system card
            msg.messageType = MessageType.TASTE_HANDSHAKE;
            msg.content = buildPreview(sharedArtists, sharedGenres);
            msg.payload = objectMapper.writeValueAsString(payload);
            msg.createdAt = Instant.now();
            messageRepository.persist(msg);
        } catch (Exception e) {
            // Best-effort icebreaker — never block match creation on it.
            Log.warnf("Failed to seed taste handshake for conversation %s: %s",
                    conversation.id, e.getMessage());
        }
    }

    private List<String> topArtistNames(UUID userId) {
        List<String> names = new ArrayList<>();
        artistPrefRepository.findByUser(userId).stream()
                .limit(SCAN_LIMIT)
                .forEach(pref -> {
                    if (pref.artist != null && pref.artist.getName() != null && !pref.artist.getName().isBlank()) {
                        names.add(pref.artist.getName());
                    }
                });
        return names;
    }

    private List<String> topGenreNames(UUID userId) {
        List<String> names = new ArrayList<>();
        genrePrefRepository.findByUser(userId).stream()
                .limit(SCAN_LIMIT)
                .forEach(pref -> {
                    if (pref.genre != null && pref.genre.name != null && !pref.genre.name.isBlank()) {
                        names.add(pref.genre.name);
                    }
                });
        return names;
    }

    /** Case-insensitive intersection preserving the first list's display casing and order. */
    private List<String> intersect(List<String> first, List<String> second) {
        java.util.Set<String> secondKeys = new java.util.HashSet<>();
        for (String s : second) {
            secondKeys.add(s.toLowerCase(Locale.ROOT));
        }
        List<String> shared = new ArrayList<>();
        java.util.Set<String> seen = new java.util.HashSet<>();
        for (String s : first) {
            String key = s.toLowerCase(Locale.ROOT);
            if (secondKeys.contains(key) && seen.add(key)) {
                shared.add(s);
                if (shared.size() >= MAX_SHARED) break;
            }
        }
        return shared;
    }

    private double score(int sharedArtists, int sharedGenres) {
        double raw = (2.0 * sharedArtists + sharedGenres) / 10.0;
        return Math.max(0d, Math.min(1d, raw));
    }

    private String buildPreview(List<String> sharedArtists, List<String> sharedGenres) {
        if (!sharedArtists.isEmpty()) {
            return "🎵 You both love " + sharedArtists.get(0);
        }
        if (!sharedGenres.isEmpty()) {
            return "🎵 You both like " + sharedGenres.get(0);
        }
        return "🎵 You both have eclectic taste";
    }
}
