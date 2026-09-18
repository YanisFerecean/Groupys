package com.groupys.service;

import com.groupys.model.DeviceToken;
import com.groupys.model.NotificationPref;
import com.groupys.notification.ExpoPushClient;
import com.groupys.notification.ExpoPushMessage;
import com.groupys.notification.ExpoPushResponse;
import com.groupys.repository.DeviceTokenRepository;
import com.groupys.repository.NotificationPrefRepository;
import com.groupys.repository.UserRepository;
import io.quarkus.logging.Log;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.rest.client.inject.RestClient;

import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Single entry point for sending Expo push notifications. Resolves each recipient's device
 * tokens + preferences (category toggle, quiet hours) on the caller's thread, then dispatches
 * the HTTP send asynchronously so request latency and DB transactions are never blocked.
 *
 * <p>Mirrors {@link PresenceService}'s per-user routing: WebSocket pushes go to online users,
 * and push notifications are suppressed for anyone currently online (a live WebSocket means the
 * app is in the foreground). Only backgrounded/closed (offline) users receive a push.
 */
@ApplicationScoped
public class NotificationService {

    private static final int EXPO_BATCH_SIZE = 100;

    @Inject
    @RestClient
    ExpoPushClient expoPushClient;

    @Inject
    DeviceTokenRepository deviceTokenRepository;

    @Inject
    NotificationPrefRepository notificationPrefRepository;

    @Inject
    UserRepository userRepository;

    @Inject
    PresenceService presenceService;

    private ExecutorService dispatcher;

    @PostConstruct
    void init() {
        dispatcher = Executors.newFixedThreadPool(2, r -> {
            Thread t = new Thread(r, "push-dispatch");
            t.setDaemon(true);
            return t;
        });
    }

    @PreDestroy
    void shutdown() {
        if (dispatcher != null) dispatcher.shutdown();
    }

    /** Notification categories, each gated by a preference toggle. Low-priority ones honor quiet hours. */
    public enum Type {
        MATCH(false),
        MESSAGE(false),
        COMMUNITY_POST(true),
        HOT_TAKE(true),
        STREAK_REMINDER(true),
        PROFILE_VIEW(true),
        MATCH_REENGAGE(true);

        /** Deferrable during quiet hours (real-time match/message always go through). */
        final boolean quietHoursApply;

        Type(boolean quietHoursApply) {
            this.quietHoursApply = quietHoursApply;
        }
    }

    /** Immutable notification payload. */
    public record Content(String title, String body, String imageUrl, Integer badge, Map<String, Object> data) {
        public static Content of(String title, String body, String deeplink) {
            Map<String, Object> data = new LinkedHashMap<>();
            if (deeplink != null) data.put("deeplink", deeplink);
            return new Content(title, body, null, null, data);
        }

        public Content withImage(String url) {
            return new Content(title, body, url, badge, data);
        }

        public Content withBadge(Integer b) {
            return new Content(title, body, imageUrl, b, data);
        }
    }

    // ── Public API ──────────────────────────────────────────────────────────────

    /** Send to a single user (respects their toggle + quiet hours). Safe to call inside a transaction. */
    public void notify(UUID userId, Type type, Content content) {
        if (userId == null) return;
        if (isActivelyOnline(userId)) return; // foreground app → no push (in-app UI handles it)
        NotificationPref pref = notificationPrefRepository.findByUser(userId).orElse(null);
        if (!isEnabled(pref, type) || isSuppressedByQuietHours(pref, type)) return;

        List<DeviceToken> tokens = deviceTokenRepository.findByUser(userId);
        if (tokens.isEmpty()) return;

        List<ExpoPushMessage> messages = new ArrayList<>(tokens.size());
        for (DeviceToken t : tokens) {
            messages.add(buildMessage(t.expoToken, type, content));
        }
        dispatch(messages);
    }

    /** Fan-out the same content to many users with one prefs/token resolution pass. */
    public void notifyAll(Collection<UUID> userIds, Type type, Content content) {
        if (userIds == null || userIds.isEmpty()) return;
        List<UUID> ids = new ArrayList<>(userIds);

        Map<UUID, NotificationPref> prefs = notificationPrefRepository.findByUsers(ids);
        List<UUID> eligible = ids.stream()
                .filter(id -> {
                    NotificationPref pref = prefs.get(id);
                    return isEnabled(pref, type) && !isSuppressedByQuietHours(pref, type);
                })
                .toList();
        if (eligible.isEmpty()) return;

        // Drop users actively using the app (foreground); only offline users get a push.
        Map<UUID, String> clerkIds = userRepository.findClerkIdsByUserIds(eligible);
        eligible = eligible.stream()
                .filter(id -> {
                    String clerkId = clerkIds.get(id);
                    return clerkId == null || !presenceService.isOnline(clerkId);
                })
                .toList();
        if (eligible.isEmpty()) return;

        List<DeviceToken> tokens = deviceTokenRepository.findByUsers(eligible);
        if (tokens.isEmpty()) return;

        List<ExpoPushMessage> messages = new ArrayList<>(tokens.size());
        for (DeviceToken t : tokens) {
            messages.add(buildMessage(t.expoToken, type, content));
        }
        dispatch(messages);
    }

    // ── Message building ──────────────────────────────────────────────────────────

    private ExpoPushMessage buildMessage(String token, Type type, Content content) {
        Map<String, Object> data = new HashMap<>(content.data() != null ? content.data() : Map.of());
        data.put("type", type.name());
        if (content.imageUrl() != null) {
            // Read by the iOS Notification Service Extension to attach a branded image.
            data.put("imageUrl", content.imageUrl());
        }
        return ExpoPushMessage.of(token, content.title(), content.body(), content.badge(), type.name(), data);
    }

    // ── Preference / quiet-hour gates ─────────────────────────────────────────────

    /** True when the user has a live WebSocket — i.e. the app is open in the foreground. */
    private boolean isActivelyOnline(UUID userId) {
        String clerkId = userRepository.findClerkIdsByUserIds(List.of(userId)).get(userId);
        return clerkId != null && presenceService.isOnline(clerkId);
    }

    private boolean isEnabled(NotificationPref pref, Type type) {
        if (pref == null) return true; // default: everything on
        return switch (type) {
            case MATCH -> pref.matchesEnabled;
            case MESSAGE -> pref.messagesEnabled;
            case COMMUNITY_POST -> pref.communityEnabled;
            case HOT_TAKE -> pref.hotTakesEnabled;
            case STREAK_REMINDER, PROFILE_VIEW, MATCH_REENGAGE -> pref.retentionEnabled;
        };
    }

    private boolean isSuppressedByQuietHours(NotificationPref pref, Type type) {
        if (!type.quietHoursApply || pref == null
                || pref.quietStartMinute == null || pref.quietEndMinute == null) {
            return false;
        }
        ZoneId zone = pref.timezone != null ? safeZone(pref.timezone) : ZoneId.of("UTC");
        int nowMinute = LocalTime.now(zone).toSecondOfDay() / 60;
        int start = pref.quietStartMinute;
        int end = pref.quietEndMinute;
        if (start == end) return false;
        // Window may wrap past midnight (e.g. 22:00 → 07:00).
        return start < end
                ? (nowMinute >= start && nowMinute < end)
                : (nowMinute >= start || nowMinute < end);
    }

    private ZoneId safeZone(String tz) {
        try {
            return ZoneId.of(tz);
        } catch (Exception e) {
            return ZoneId.of("UTC");
        }
    }

    // ── Async dispatch + dead-token cleanup ───────────────────────────────────────

    private void dispatch(List<ExpoPushMessage> messages) {
        for (int i = 0; i < messages.size(); i += EXPO_BATCH_SIZE) {
            List<ExpoPushMessage> chunk = new ArrayList<>(
                    messages.subList(i, Math.min(i + EXPO_BATCH_SIZE, messages.size())));
            dispatcher.execute(() -> sendChunk(chunk));
        }
    }

    private void sendChunk(List<ExpoPushMessage> chunk) {
        try {
            ExpoPushResponse response = expoPushClient.send(chunk);
            if (response == null || response.data() == null) return;
            List<ExpoPushResponse.Ticket> tickets = response.data();
            for (int i = 0; i < tickets.size() && i < chunk.size(); i++) {
                ExpoPushResponse.Ticket ticket = tickets.get(i);
                if (ticket.isError() && "DeviceNotRegistered".equals(ticket.errorCode())) {
                    pruneToken(chunk.get(i).to());
                }
            }
        } catch (Exception e) {
            // Push is best-effort; the underlying event (match/message/post) is already persisted.
            Log.warnf(e, "Expo push send failed for %d message(s)", chunk.size());
        }
    }

    private void pruneToken(String token) {
        try {
            QuarkusTransaction.requiringNew().run(() -> deviceTokenRepository.deleteByToken(token));
        } catch (Exception e) {
            Log.warnf(e, "Failed to prune dead push token");
        }
    }
}
