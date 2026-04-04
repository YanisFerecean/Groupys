package com.groupys.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "community_artist", uniqueConstraints = {
        @UniqueConstraint(name = "uk_community_artist_source", columnNames = {"community_id", "artist_id", "source"})
}, indexes = {
        @Index(name = "idx_community_artist_community_score", columnList = "community_id,normalized_score"),
        @Index(name = "idx_community_artist_artist_score", columnList = "artist_id,normalized_score")
})
public class CommunityArtist {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "community_id", nullable = false)
    public Community community;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "artist_id", nullable = false)
    public Artist artist;

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
