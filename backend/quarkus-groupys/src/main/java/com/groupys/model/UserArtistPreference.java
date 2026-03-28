package com.groupys.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_artist_preference", uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_artist_pref", columnNames = {"user_id", "artist_id", "source", "source_window"})
}, indexes = {
        @Index(name = "idx_user_artist_pref_user_score", columnList = "user_id,normalized_score"),
        @Index(name = "idx_user_artist_pref_artist_score", columnList = "artist_id,normalized_score")
})
public class UserArtistPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    public User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "artist_id", nullable = false)
    public Artist artist;

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

    @Column(nullable = false)
    public Double confidence = 1d;

    @Column(name = "is_explicit", nullable = false)
    public boolean explicitPreference;

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
