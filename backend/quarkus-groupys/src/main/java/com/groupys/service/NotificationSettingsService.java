package com.groupys.service;

import com.groupys.model.DeviceToken;
import com.groupys.model.NotificationPref;
import com.groupys.model.User;
import com.groupys.repository.DeviceTokenRepository;
import com.groupys.repository.NotificationPrefRepository;
import com.groupys.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;

import java.time.Instant;

/**
 * Device-token registration + notification-preference management for the mobile client.
 */
@ApplicationScoped
public class NotificationSettingsService {

    @Inject
    UserRepository userRepository;

    @Inject
    DeviceTokenRepository deviceTokenRepository;

    @Inject
    NotificationPrefRepository notificationPrefRepository;

    private User requireUser(String clerkId) {
        return userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    /** Upsert an Expo push token. If the token exists for another user (device handed over), reassign it. */
    @Transactional
    public void registerToken(String clerkId, String expoToken, String platform) {
        if (expoToken == null || expoToken.isBlank()) {
            throw new jakarta.ws.rs.BadRequestException("expoToken is required");
        }
        User user = requireUser(clerkId);
        DeviceToken token = deviceTokenRepository.findByToken(expoToken).orElse(null);
        if (token == null) {
            token = new DeviceToken();
            token.expoToken = expoToken;
        }
        token.user = user;
        token.platform = platform != null ? platform : "ios";
        token.lastUsedAt = Instant.now();
        deviceTokenRepository.persist(token);
    }

    @Transactional
    public void removeToken(String clerkId, String expoToken) {
        deviceTokenRepository.deleteByToken(expoToken);
    }

    /** Returns the user's prefs, creating a default row on first read so the client can edit it. */
    @Transactional
    public NotificationPref getOrCreatePreferences(String clerkId) {
        User user = requireUser(clerkId);
        return notificationPrefRepository.findByUser(user.id).orElseGet(() -> {
            NotificationPref pref = new NotificationPref();
            pref.user = user;
            notificationPrefRepository.persist(pref);
            return pref;
        });
    }

    @Transactional
    public NotificationPref updatePreferences(String clerkId, NotificationPref incoming) {
        NotificationPref pref = getOrCreatePreferences(clerkId);
        pref.matchesEnabled = incoming.matchesEnabled;
        pref.messagesEnabled = incoming.messagesEnabled;
        pref.communityEnabled = incoming.communityEnabled;
        pref.hotTakesEnabled = incoming.hotTakesEnabled;
        pref.retentionEnabled = incoming.retentionEnabled;
        pref.quietStartMinute = clampMinute(incoming.quietStartMinute);
        pref.quietEndMinute = clampMinute(incoming.quietEndMinute);
        pref.timezone = incoming.timezone;
        return pref;
    }

    private Integer clampMinute(Integer minute) {
        if (minute == null) return null;
        return Math.max(0, Math.min(1439, minute));
    }
}
