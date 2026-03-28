package com.groupys.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_track_preference", uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_track_pref", columnNames = {"user_id", "track_id", "source", "source_window"})
}, indexes = {
        @Index(name = "idx_user_track_pref_user_score", columnList = "user_id,normalized_score"),
        @Index(name = "idx_user_track_pref_track_score", columnList = "track_id,normalized_score")
})
public class UserTrackPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    public User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "track_id", nullable = false)
    public Track track;

    @Column(nullable = false)
    public String source;

    @Column(name = "source_window")
    public String sourceWindow;

    @Column(name = "rank_position")
    public Integer rankPosition;

    @Column(name = "raw_score", nullable = false)
    public Double rawScore;

    @Column(name = "normalized_score", nullable = false)
    public Double normalizedScore;

    @Column(name = "first_seen_at", nullable = false)
    public Instant firstSeenAt;

    @Column(name = "last_seen_at", nullable = false)
    public Instant lastSeenAt;

    @PrePersist
    void onPersist() {
        Instant now = Instant.now();
        if (firstSeenAt == null) {
            firstSeenAt = now;
        }
        if (lastSeenAt == null) {
            lastSeenAt = now;
        }
    }
}
