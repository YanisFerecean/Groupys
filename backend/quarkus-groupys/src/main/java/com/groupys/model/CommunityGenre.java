package com.groupys.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "community_genre", uniqueConstraints = {
        @UniqueConstraint(name = "uk_community_genre_source", columnNames = {"community_id", "genre_id", "source"})
}, indexes = {
        @Index(name = "idx_community_genre_community_score", columnList = "community_id,normalized_score"),
        @Index(name = "idx_community_genre_genre_score", columnList = "genre_id,normalized_score")
})
public class CommunityGenre {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "community_id", nullable = false)
    public Community community;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "genre_id", nullable = false)
    public Genre genre;

    @Column(nullable = false)
    public String source;

    @Column(name = "member_support_count", nullable = false)
    public int memberSupportCount;

    @Column(name = "raw_score", nullable = false)
    public Double rawScore;

    @Column(name = "normalized_score", nullable = false)
    public Double normalizedScore;

    @Column(name = "refreshed_at", nullable = false)
    public Instant refreshedAt;

    @PrePersist
    void onPersist() {
        if (refreshedAt == null) {
            refreshedAt = Instant.now();
        }
    }
}
