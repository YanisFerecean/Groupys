package com.groupys.service;

import io.quarkus.websockets.next.WebSocketConnection;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory WebSocket presence tracker.
 * Stores one WebSocketConnection per clerkId (one active tab wins; reconnect replaces).
 */
@ApplicationScoped
public class PresenceService {

    private final ConcurrentHashMap<String, WebSocketConnection> activeSessions = new ConcurrentHashMap<>();

    public void register(String clerkId, WebSocketConnection connection) {
        WebSocketConnection old = activeSessions.put(clerkId, connection);
        if (old != null && !old.isClosed() && !old.id().equals(connection.id())) {
            old.close();
        }
    }

    /**
     * Removes the connection only if it is still the current registered connection for clerkId.
     * Safe against the race where a new connection authenticates before the old one's @OnClose fires.
     */
    public void remove(String clerkId, WebSocketConnection connection) {
        activeSessions.remove(clerkId, connection);
    }

    public boolean isOnline(String clerkId) {
        WebSocketConnection s = activeSessions.get(clerkId);
        return s != null && !s.isClosed();
    }

    /**
     * Send a serialised JSON string to the specified user (no-op if offline).
     */
    public void sendTo(String clerkId, String json) {
        WebSocketConnection connection = activeSessions.get(clerkId);
        if (connection != null && !connection.isClosed()) {
            connection.sendTextAndAwait(json);
        }
    }

    /**
     * Broadcast a JSON payload to all clerkIds in the list, skipping the excluded one.
     */
    public void broadcast(List<String> clerkIds, String excludeClerkId, String json) {
        for (String clerkId : clerkIds) {
            if (!clerkId.equals(excludeClerkId)) {
                sendTo(clerkId, json);
            }
        }
    }
}

