package com.groupys.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "community_taste_profile", uniqueConstraints = {
        @UniqueConstraint(name = "uk_community_taste_profile_community", columnNames = "community_id")
}, indexes = {
        @Index(name = "idx_community_taste_profile_refreshed", columnList = "refreshed_at"),
        @Index(name = "idx_community_taste_profile_country", columnList = "country_code")
})
public class CommunityTasteProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "community_id", nullable = false)
    public Community community;

    @Column(name = "profile_version", nullable = false)
    public int profileVersion = 1;

    @Column(name = "member_sample_size", nullable = false)
    public int memberSampleSize;

    @Column(name = "top_artists_count", nullable = false)
    public int topArtistsCount;

    @Column(name = "top_genres_count", nullable = false)
    public int topGenresCount;

    @Column(name = "activity_score", nullable = false)
    public Double activityScore = 0d;

    @Column(name = "country_code", length = 2)
    public String countryCode;

    @Column(name = "taste_summary_text", columnDefinition = "TEXT")
    public String tasteSummaryText;

    @Column(name = "embedding_status", nullable = false)
    public String embeddingStatus = "NONE";

    @Column(name = "embedding_model", length = 64)
    public String embeddingModel;

    @Column(name = "embedding_updated_at")
    public Instant embeddingUpdatedAt;

    @Column(name = "refreshed_at", nullable = false)
    public Instant refreshedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt;

    @PrePersist
    void onPersist() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (refreshedAt == null) {
            refreshedAt = now;
        }
    }
}
