package com.groupys.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Ephemeral "daily song" status (chat × music plan, ticket 5.2). One per user; expires 24h
 * after posting. Visible to the poster's conversation partners.
 */
@Entity
@Table(name = "daily_song", uniqueConstraints = {
        @UniqueConstraint(name = "uk_daily_song_user", columnNames = "user_id")
}, indexes = {
        @Index(name = "idx_daily_song_expires", columnList = "expires_at")
})
public class DailySong {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    public User user;

    /** Raw JSON track payload (title, artist, artworkUrl, previewUrl, …). */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", columnDefinition = "jsonb", nullable = false)
    public String payload;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    public Instant expiresAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
