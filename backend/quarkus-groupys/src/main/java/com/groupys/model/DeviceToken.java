package com.groupys.model;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;
import java.util.UUID;

/**
 * One Expo push token per device. A user may register several (phone, tablet, reinstall).
 * Dead tokens (Expo "DeviceNotRegistered" receipts) are deleted by NotificationService.
 */
@Entity
@Table(name = "device_tokens", indexes = {
    @Index(name = "idx_device_tokens_user_id", columnList = "user_id"),
    @Index(name = "idx_device_tokens_expo_token", columnList = "expo_token", unique = true)
})
public class DeviceToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    public User user;

    /** Expo push token, e.g. ExponentPushToken[xxxxxxxx]. */
    @Column(name = "expo_token", nullable = false, unique = true, columnDefinition = "TEXT")
    public String expoToken;

    @Column(name = "platform", length = 16)
    public String platform;

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt;

    @Column(name = "last_used_at")
    public Instant lastUsedAt;

    @PrePersist
    void onPersist() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (lastUsedAt == null) lastUsedAt = now;
    }
}
