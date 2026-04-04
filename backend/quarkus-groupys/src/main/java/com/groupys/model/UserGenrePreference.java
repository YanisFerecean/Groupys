package com.groupys.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_genre_preference", uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_genre_pref", columnNames = {"user_id", "genre_id", "source"})
}, indexes = {
        @Index(name = "idx_user_genre_pref_user_score", columnList = "user_id,normalized_score"),
        @Index(name = "idx_user_genre_pref_genre_score", columnList = "genre_id,normalized_score")
})
public class UserGenrePreference {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    public User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "genre_id", nullable = false)
    public Genre genre;

    @Column(nullable = false)
    public String source;

    @Column(name = "raw_score", nullable = false)
    public Double rawScore;

    @Column(name = "normalized_score", nullable = false)
    public Double normalizedScore;

    @Column(nullable = false)
    public Double confidence = 1d;

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
