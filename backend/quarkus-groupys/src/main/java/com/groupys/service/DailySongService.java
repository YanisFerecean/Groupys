package com.groupys.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.groupys.dto.DailySongResDto;
import com.groupys.model.DailySong;
import com.groupys.model.User;
import com.groupys.repository.ConversationRepository;
import com.groupys.repository.DailySongRepository;
import com.groupys.repository.UserRepository;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Daily-song ephemeral status (ticket 5.2). */
@ApplicationScoped
public class DailySongService {

    private static final Duration TTL = Duration.ofHours(24);

    @Inject
    DailySongRepository dailySongRepository;

    @Inject
    UserRepository userRepository;

    @Inject
    ConversationRepository conversationRepository;

    @Inject
    ObjectMapper objectMapper;

    /** Upsert the current user's daily song (replaces any existing one), expiring in 24h. */
    @Transactional
    public DailySongResDto post(String clerkId, JsonNode track) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        if (track == null || !track.isObject() || track.path("title").asText("").isBlank()) {
            throw new BadRequestException("A track with a title is required");
        }

        String json;
        try {
            json = objectMapper.writeValueAsString(track);
        } catch (Exception e) {
            throw new BadRequestException("Invalid track payload");
        }
        if (json.length() > 16000) {
            throw new BadRequestException("Track payload too large");
        }

        Instant now = Instant.now();
        DailySong song = dailySongRepository.findByUser(user.id).orElseGet(DailySong::new);
        song.user = user;
        song.payload = json;
        song.createdAt = now;
        song.expiresAt = now.plus(TTL);
        if (song.id == null) {
            dailySongRepository.persist(song);
        }
        return toDto(user, song);
    }

    @Transactional
    public void deleteOwn(String clerkId) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        dailySongRepository.findByUser(user.id).ifPresent(dailySongRepository::delete);
    }

    /** Active daily songs of the user's conversation partners plus their own, newest first. */
    public List<DailySongResDto> feed(String clerkId) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        List<UUID> ids = new ArrayList<>(conversationRepository.findAllConversationPartnerIds(user.id));
        ids.add(user.id);

        Instant now = Instant.now();
        List<DailySongResDto> out = new ArrayList<>();
        for (DailySong song : dailySongRepository.findActiveForUsers(ids, now)) {
            out.add(toDto(song.user, song));
        }
        return out;
    }

    private DailySongResDto toDto(User user, DailySong song) {
        JsonNode track;
        try {
            track = objectMapper.readTree(song.payload);
        } catch (Exception e) {
            track = objectMapper.createObjectNode();
        }
        return new DailySongResDto(
                user.id, user.username, user.displayName, user.profileImage,
                track, song.createdAt, song.expiresAt);
    }

    /** Reaps expired daily songs (retention job, mirrors other @Scheduled cleanups). */
    @Transactional
    public void reapExpired() {
        long removed = dailySongRepository.deleteExpired(Instant.now());
        if (removed > 0) {
            Log.debugf("Reaped %d expired daily song(s)", removed);
        }
    }
}
