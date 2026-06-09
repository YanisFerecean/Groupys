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
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    public ListeningPartyStartJob(
            ListeningPartyService partyService,
            ChatService chatService,
            PresenceService presenceService,
            NotificationService notificationService,
            ObjectMapper objectMapper) {
        this.partyService = partyService;
        this.chatService = chatService;
        this.presenceService = presenceService;
        this.notificationService = notificationService;
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
                notifyStart(party);
            } catch (Exception e) {
                LOG.warnf("Failed to broadcast party start %s: %s", party.id(), e.getMessage());
            }
        }
    }

    /** Push "starting now" to every participant except the host (whose client opens the room). */
    private void notifyStart(ListeningPartyDto party) {
        String trackTitle = party.track() != null ? party.track().path("title").asText(null) : null;
        String body = trackTitle != null && !trackTitle.isBlank()
                ? "\"" + trackTitle + "\" is starting now"
                : "Your listening party is starting now";
        String deeplink = "/(home)/(match)/chat/" + party.conversationId();
        NotificationService.Content content = NotificationService.Content
                .of("Listening party", body, deeplink);
        chatService.getParticipantClerkIds(party.conversationId()).forEach((pid, clerkId) -> {
            if (!pid.equals(party.hostUserId()) && !chatService.isConversationMuted(party.conversationId(), pid)) {
                notificationService.notify(pid, NotificationService.Type.MESSAGE, content);
            }
        });
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
