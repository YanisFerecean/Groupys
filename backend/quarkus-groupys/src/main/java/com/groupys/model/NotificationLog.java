package com.groupys.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/**
 * De-dupe ledger for scheduled / one-shot notifications. A unique (user, type, ref_key)
 * guarantees idempotency so retention jobs never double-send (e.g. one re-engagement nudge
 * per match, one streak reminder per day).
 */
@Entity
@Table(name = "notification_logs", uniqueConstraints = {
    @UniqueConstraint(name = "uq_notification_logs_dedupe", columnNames = {"user_id", "type", "ref_key"})
}, indexes = {
    @Index(name = "idx_notification_logs_user_type", columnList = "user_id,type")
})
public class NotificationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "user_id", nullable = false)
    public UUID userId;

    @Column(name = "type", nullable = false, length = 48)
    public String type;

    /** Stable key for the thing this notification is about (matchId, date, hotTakeId…). */
    @Column(name = "ref_key", nullable = false, length = 128)
    public String refKey;

    @Column(name = "sent_at", nullable = false, updatable = false)
    public Instant sentAt;

    @PrePersist
    void onPersist() {
        if (sentAt == null) sentAt = Instant.now();
    }
}
