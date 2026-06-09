package com.groupys.resource;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.groupys.dto.ConversationResDto;
import com.groupys.dto.MessageResDto;
import com.groupys.dto.LinkPreviewResDto;
import com.groupys.service.ChatService;
import com.groupys.service.LinkPreviewService;
import com.groupys.service.NotificationService;
import com.groupys.service.PresenceService;
import com.groupys.service.UserService;
import com.groupys.websocket.WebSocketMessage;
import io.quarkus.security.Authenticated;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Path("/chat")
@Authenticated
@RequestScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@SecurityRequirement(name = "bearerAuth")
public class ConversationResource {

    @Inject
    ChatService chatService;

    @Inject
    LinkPreviewService linkPreviewService;

    @Inject
    PresenceService presenceService;

    @Inject
    NotificationService notificationService;

    @Inject
    ObjectMapper objectMapper;

    @Inject
    JsonWebToken jwt;

    @Inject
    UserService userService;

    // ── Conversations ─────────────────────────────────────────────────────────

    @GET
    @Path("/conversations")
    public List<ConversationResDto> listConversations(
            @QueryParam("cursor") String cursorParam,
            @QueryParam("size") @DefaultValue("20") int size) {
        Instant cursor = cursorParam != null ? Instant.parse(cursorParam) : null;
        return chatService.getConversationsPaged(jwt.getSubject(), Math.min(size, 50), cursor);
    }

    @GET
    @Path("/conversations/{id}")
    public ConversationResDto getConversation(@PathParam("id") UUID id) {
        return chatService.getConversation(id, jwt.getSubject());
    }

    /** body: { "targetUserId": "uuid" } */
    @POST
    @Path("/conversations")
    public Response startConversation(StartConversationRequest req) {
        ConversationResDto dto = chatService.getOrCreateDirectConversation(jwt.getSubject(), req.targetUserId());
        return Response.ok(dto).build();
    }

    @POST
    @Path("/conversations/{id}/accept")
    public ConversationResDto acceptConversationRequest(@PathParam("id") UUID id) {
        return chatService.acceptConversationRequest(id, jwt.getSubject());
    }

    @DELETE
    @Path("/conversations/{id}/request")
    public Response denyConversationRequest(@PathParam("id") UUID id) {
        chatService.denyConversationRequest(id, jwt.getSubject());
        return Response.noContent().build();
    }

    @PUT
    @Path("/conversations/{id}/mute")
    public ConversationResDto setConversationMute(@PathParam("id") UUID id, MuteConversationRequest req) {
        return chatService.setConversationMute(id, jwt.getSubject(), req != null ? req.until() : null);
    }

    // ── Messages ──────────────────────────────────────────────────────────────

    @GET
    @Path("/conversations/{id}/messages")
    public List<MessageResDto> getMessages(
            @PathParam("id") UUID id,
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("30") int size) {
        return chatService.getMessages(id, jwt.getSubject(), page, Math.min(size, 50));
    }

    @GET
    @Path("/conversations/{id}/messages/search")
    public List<MessageResDto> searchMessages(
            @PathParam("id") UUID id,
            @QueryParam("q") String query,
            @QueryParam("limit") @DefaultValue("50") int limit) {
        return chatService.searchMessages(id, jwt.getSubject(), query, limit);
    }

    @GET
    @Path("/conversations/{id}/pins")
    public List<MessageResDto> getPins(@PathParam("id") UUID id) {
        return chatService.getPins(id, jwt.getSubject());
    }

    @POST
    @Path("/conversations/{id}/messages")
    public Response sendMessage(@PathParam("id") UUID id, SendMessageRequest req) {
        String payloadJson = null;
        if (req.payload() != null) {
            try {
                payloadJson = objectMapper.writeValueAsString(req.payload());
            } catch (Exception e) {
                throw new BadRequestException("Invalid message payload");
            }
        }
        MessageResDto msg = chatService.sendMessage(
                id, jwt.getSubject(), req.content(), req.messageType(), payloadJson, req.replyToId(), req.mediaUrl());
        pushMessageNew(msg, jwt.getSubject());
        return Response.status(Response.Status.CREATED).entity(msg).build();
    }

    private void pushMessageNew(MessageResDto msg, String senderClerkId) {
        try {
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("id", msg.id().toString());
            data.put("conversationId", msg.conversationId().toString());
            data.put("senderId", msg.senderId().toString());
            data.put("senderUsername", msg.senderUsername());
            data.put("senderDisplayName", msg.senderDisplayName());
            data.put("senderProfileImage", msg.senderProfileImage());
            data.put("content", msg.content());
            data.put("messageType", msg.messageType());
            if (msg.payload() != null) {
                data.put("payload", msg.payload());
            }
            if (msg.mediaUrl() != null) {
                data.put("mediaUrl", msg.mediaUrl());
            }
            if (msg.replyToId() != null) {
                data.put("replyToId", msg.replyToId().toString());
            }
            if (msg.replyTo() != null) {
                data.put("replyTo", msg.replyTo());
            }
            data.put("createdAt", msg.createdAt().toString());
            String json = objectMapper.writeValueAsString(new WebSocketMessage("MESSAGE_NEW", data));
            String deeplink = "/(home)/(match)/chat/" + msg.conversationId();
            String senderName = msg.senderDisplayName() != null && !msg.senderDisplayName().isBlank()
                    ? msg.senderDisplayName() : msg.senderUsername();
            chatService.getParticipantClerkIds(msg.conversationId()).forEach((userId, clerkId) -> {
                if (clerkId.equals(senderClerkId)) return;
                if (presenceService.isOnline(clerkId)) {
                    presenceService.sendTo(clerkId, json);
                }
                // Push even when websocket is connected: iOS may keep the socket alive in states where
                // the user still expects an OS notification.
                NotificationService.Content content = NotificationService.Content
                        .of(senderName, "Sent you a message", deeplink)
                        .withImage(msg.senderProfileImage());
                if (!chatService.isConversationMuted(msg.conversationId(), userId)) {
                    notificationService.notify(userId, NotificationService.Type.MESSAGE, content);
                }
            });
        } catch (Exception e) {
            // WS/push are best-effort — message is already saved
        }
    }

    @DELETE
    @Path("/messages/{messageId}")
    public Response deleteMessage(@PathParam("messageId") UUID messageId) {
        chatService.deleteMessage(messageId, jwt.getSubject());
        return Response.noContent().build();
    }

    @PUT
    @Path("/conversations/{id}/read")
    public Response markRead(@PathParam("id") UUID id) {
        chatService.markRead(id, jwt.getSubject());
        return Response.noContent().build();
    }

    @GET
    @Path("/link-preview")
    public LinkPreviewResDto resolveLinkPreview(@QueryParam("url") String url) {
        return linkPreviewService.resolve(url);
    }

    // ── E2E public keys ───────────────────────────────────────────────────────

    @GET
    @Path("/keys/{username}")
    public Response getPublicKey(@PathParam("username") String username) {
        String key = userService.getPublicKeyByUsername(username);
        return Response.ok(Map.of("publicKey", key)).build();
    }

    @PUT
    @Path("/keys/me")
    public Response savePublicKey(PublicKeyRequest req) {
        userService.savePublicKey(jwt.getSubject(), req.publicKey());
        return Response.noContent().build();
    }

    // ── Request records ───────────────────────────────────────────────────────

    public record StartConversationRequest(UUID targetUserId) {}
    public record MuteConversationRequest(Instant until) {}
    public record SendMessageRequest(String content, String messageType, com.fasterxml.jackson.databind.JsonNode payload, UUID replyToId, String mediaUrl) {}
    public record PublicKeyRequest(String publicKey) {}
}
