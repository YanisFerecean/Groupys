package com.groupys.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.groupys.dto.ListeningPartyDto;
import com.groupys.model.Conversation;
import com.groupys.model.ListeningParty;
import com.groupys.model.User;
import com.groupys.repository.ConversationRepository;
import com.groupys.repository.ListeningPartyRepository;
import com.groupys.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/** Persists and starts scheduled preview-sync parties without relaying audio (ticket 6.2). */
@ApplicationScoped
public class ListeningPartyService {

    private final ListeningPartyRepository partyRepository;
    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public ListeningPartyService(
            ListeningPartyRepository partyRepository,
            ConversationRepository conversationRepository,
            UserRepository userRepository,
            ObjectMapper objectMapper) {
        this.partyRepository = partyRepository;
        this.conversationRepository = conversationRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ListeningPartyDto schedule(UUID conversationId, String clerkId, Instant startAt, String trackJson) {
        User host = requireParticipant(conversationId, clerkId);
        Instant now = Instant.now();
        if (startAt == null || startAt.isBefore(now.plusSeconds(5))
                || startAt.isAfter(now.plus(30, ChronoUnit.DAYS))) {
            throw new BadRequestException("Party start must be between 5 seconds and 30 days from now");
        }

        JsonNode track = parseAndValidateTrack(trackJson);
        ListeningParty current = partyRepository.findCurrent(conversationId);
        if (current != null) {
            current.status = "CANCELLED";
        }

        Conversation conversation = conversationRepository.findByIdOptional(conversationId)
                .orElseThrow(() -> new NotFoundException("Conversation not found"));
        ListeningParty party = new ListeningParty();
        party.conversation = conversation;
        party.host = host;
        party.startAt = startAt;
        party.trackPayload = write(track);
        partyRepository.persist(party);
        return toDto(party);
    }

    public ListeningPartyDto getCurrent(UUID conversationId, String clerkId) {
        requireParticipant(conversationId, clerkId);
        ListeningParty party = partyRepository.findCurrent(conversationId);
        return party == null ? null : toDto(party);
    }

    public ListeningPartyDto requireParty(UUID partyId, String clerkId) {
        ListeningParty party = partyRepository.findByIdOptional(partyId)
                .orElseThrow(() -> new NotFoundException("Party not found"));
        requireParticipant(party.conversation.id, clerkId);
        if ("CANCELLED".equals(party.status)) {
            throw new BadRequestException("Party is no longer available");
        }
        return toDto(party);
    }

    /**
     * Ends the current STARTED party when its song finishes. Only the host (whose playback drives
     * the synced timeline) can end it. Returns the ended party, or {@code null} if there is nothing
     * to end or the caller is not the host.
     */
    @Transactional
    public ListeningPartyDto endActive(UUID conversationId, String clerkId) {
        User user = requireParticipant(conversationId, clerkId);
        ListeningParty party = partyRepository.findCurrent(conversationId);
        if (party == null || !"STARTED".equals(party.status) || !party.host.id.equals(user.id)) {
            return null;
        }
        party.status = "ENDED";
        return toDto(party);
    }

    @Transactional
    public List<ListeningPartyDto> startDueParties() {
        return partyRepository.findDue(Instant.now()).stream()
                .map(party -> {
                    party.status = "STARTED";
                    return toDto(party);
                })
                .toList();
    }

    private User requireParticipant(UUID conversationId, String clerkId) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        conversationRepository.findParticipant(conversationId, user.id)
                .orElseThrow(() -> new ForbiddenException("Not a participant in this conversation"));
        return user;
    }

    private JsonNode parseAndValidateTrack(String trackJson) {
        JsonNode track;
        try {
            track = objectMapper.readTree(trackJson);
        } catch (Exception e) {
            throw new BadRequestException("Invalid party track");
        }
        String title = track.path("title").asText(null);
        String previewUrl = track.path("previewUrl").asText(null);
        if (!"TRACK".equalsIgnoreCase(track.path("type").asText(""))
                || title == null || title.isBlank()
                || previewUrl == null
                || (!previewUrl.startsWith("https://") && !previewUrl.startsWith("http://"))) {
            throw new BadRequestException("Listening party requires a track with a public preview");
        }
        return track;
    }

    private String write(JsonNode track) {
        try {
            return objectMapper.writeValueAsString(track);
        } catch (Exception e) {
            throw new BadRequestException("Invalid party track");
        }
    }

    private ListeningPartyDto toDto(ListeningParty party) {
        JsonNode track;
        try {
            track = objectMapper.readTree(party.trackPayload);
        } catch (Exception e) {
            track = null;
        }
        return new ListeningPartyDto(
                party.id, party.conversation.id, party.host.id, party.host.clerkId,
                party.startAt, track, party.status);
    }
}
