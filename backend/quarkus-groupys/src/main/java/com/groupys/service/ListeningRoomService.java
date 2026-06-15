package com.groupys.service;

import jakarta.enterprise.context.ApplicationScoped;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory Listen-Together room state (chat × music plan, ticket 7.1).
 *
 * <p>Only playback metadata (track ref, position, play/pause) is stored and relayed — never audio.
 * Rooms are keyed by conversationId and are ephemeral (no persistence).
 */
@ApplicationScoped
public class ListeningRoomService {

    public static final class Room {
        public volatile String hostClerkId;
        public volatile String hostUserId;
        public volatile Map<String, Object> track;
        public volatile long positionMs;
        public volatile boolean isPlaying;
        /** Host is driving a full-song timeline (host has Apple Music); else a 30s-preview lite room. */
        public volatile boolean full;
        public volatile long updatedAt;
        public final Set<String> members = ConcurrentHashMap.newKeySet();
    }

    private final ConcurrentHashMap<String, Room> rooms = new ConcurrentHashMap<>();

    public Room getOrCreate(String conversationId) {
        return rooms.computeIfAbsent(conversationId, k -> new Room());
    }

    public Room get(String conversationId) {
        return rooms.get(conversationId);
    }

    public void join(String conversationId, String clerkId) {
        getOrCreate(conversationId).members.add(clerkId);
    }

    /** Removes a member; if they were the host, clears the host so a follower can take over. */
    public void leave(String conversationId, String clerkId) {
        Room room = rooms.get(conversationId);
        if (room == null) return;
        room.members.remove(clerkId);
        if (clerkId.equals(room.hostClerkId)) {
            room.hostClerkId = null;
            room.isPlaying = false;
        }
        if (room.members.isEmpty()) {
            rooms.remove(conversationId);
        }
    }

    public void updateState(String conversationId, String hostClerkId, String hostUserId,
                            Map<String, Object> track, long positionMs, boolean isPlaying, boolean full) {
        Room room = getOrCreate(conversationId);
        room.hostClerkId = hostClerkId;
        room.hostUserId = hostUserId;
        room.track = track;
        room.positionMs = positionMs;
        room.isPlaying = isPlaying;
        room.full = full;
        room.updatedAt = System.currentTimeMillis();
        room.members.add(hostClerkId);
    }
}
