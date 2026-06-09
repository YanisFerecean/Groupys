package com.groupys.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.groupys.dto.ListeningPartyDto;
import com.groupys.websocket.WebSocketMessage;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import org.jboss.logging.Logger;

import java.util.LinkedHashMap;
import java.util.Map;

/** Emits PARTY_START when persisted parties become due (ticket 6.2). */
@ApplicationScoped
public class ListeningPartyStartJob {

    private static final Logger LOG = Logger.getLogger(ListeningPartyStartJob.class);

    private final ListeningPartyService partyService;
    private final ChatService chatService;
    private final PresenceService presenceService;
    private final ObjectMapper objectMapper;

    public ListeningPartyStartJob(
            ListeningPartyService partyService,
            ChatService chatService,
            PresenceService presenceService,
            ObjectMapper objectMapper) {
        this.partyService = partyService;
        this.chatService = chatService;
        this.presenceService = presenceService;
        this.objectMapper = objectMapper;
    }

    @Scheduled(every = "1s", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void startDueParties() {
        for (ListeningPartyDto party : partyService.startDueParties()) {
            try {
                String json = objectMapper.writeValueAsString(
                        new WebSocketMessage("PARTY_START", payload(party)));
                chatService.getParticipantClerkIds(party.conversationId())
                        .forEach((userId, clerkId) -> presenceService.sendTo(clerkId, json));
            } catch (Exception e) {
                LOG.warnf("Failed to broadcast party start %s: %s", party.id(), e.getMessage());
            }
        }
    }

    public static Map<String, Object> payload(ListeningPartyDto party) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", party.id().toString());
        payload.put("conversationId", party.conversationId().toString());
        payload.put("hostUserId", party.hostUserId().toString());
        payload.put("hostClerkId", party.hostClerkId());
        payload.put("startAt", party.startAt().toString());
        payload.put("track", party.track());
        payload.put("status", party.status());
        return payload;
    }
}
