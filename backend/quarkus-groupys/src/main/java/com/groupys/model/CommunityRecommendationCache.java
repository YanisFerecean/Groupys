package com.groupys.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "community_recommendation_cache", uniqueConstraints = {
        @UniqueConstraint(name = "uk_community_recommendation_cache_pair", columnNames = {"user_id", "community_id"})
}, indexes = {
        @Index(name = "idx_community_rec_cache_user_score", columnList = "user_id,score"),
        @Index(name = "idx_community_rec_cache_community", columnList = "community_id"),
        @Index(name = "idx_community_rec_cache_expires", columnList = "expires_at")
})
public class CommunityRecommendationCache {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    public User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "community_id", nullable = false)
    public Community community;

    @Column(nullable = false)
    public Double score;

    @Column(name = "artist_overlap_score", nullable = false)
    public Double artistOverlapScore = 0d;

    @Column(name = "genre_overlap_score", nullable = false)
    public Double genreOverlapScore = 0d;

    @Column(name = "social_fit_score", nullable = false)
    public Double socialFitScore = 0d;

    @Column(name = "activity_fit_score", nullable = false)
    public Double activityFitScore = 0d;

    @Column(name = "country_score", nullable = false)
    public Double countryScore = 0d;

    @Column(name = "embedding_score", nullable = false)
    public Double embeddingScore = 0d;

    @Column(name = "primary_reason_code")
    public String primaryReasonCode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "explanation_json", columnDefinition = "jsonb")
    public String explanationJson;

    @Column(name = "rank_position")
    public Integer rankPosition;

    @Column(name = "computed_at", nullable = false)
    public Instant computedAt;

    @Column(name = "expires_at", nullable = false)
    public Instant expiresAt;

    @PrePersist
    void onPersist() {
        if (computedAt == null) {
            computedAt = Instant.now();
        }
    }
}
