package com.groupys.model;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;

import java.util.UUID;

/**
 * Per-user notification settings: category toggles + quiet hours.
 * Quiet hours are stored as minutes-from-local-midnight in the user's timezone.
 * A null row means "all defaults on, no quiet hours".
 */
@Entity
@Table(name = "notification_prefs", indexes = {
    @Index(name = "idx_notification_prefs_user_id", columnList = "user_id", unique = true)
})
public class NotificationPref {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    public User user;

    @Column(name = "matches_enabled", nullable = false)
    @ColumnDefault("true")
    public boolean matchesEnabled = true;

    @Column(name = "messages_enabled", nullable = false)
    @ColumnDefault("true")
    public boolean messagesEnabled = true;

    @Column(name = "community_enabled", nullable = false)
    @ColumnDefault("true")
    public boolean communityEnabled = true;

    @Column(name = "hot_takes_enabled", nullable = false)
    @ColumnDefault("true")
    public boolean hotTakesEnabled = true;

    /** Retention nudges (streak reminder, profile-view teaser, match re-engagement). */
    @Column(name = "retention_enabled", nullable = false)
    @ColumnDefault("true")
    public boolean retentionEnabled = true;

    /** Quiet-hours window in minutes from local midnight [0,1440); null = disabled. Window may wrap past midnight. */
    @Column(name = "quiet_start_minute")
    public Integer quietStartMinute;

    @Column(name = "quiet_end_minute")
    public Integer quietEndMinute;

    /** IANA timezone, e.g. "Europe/Zurich". Falls back to UTC when null. */
    @Column(name = "timezone", length = 64)
    public String timezone;
}
