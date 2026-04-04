package com.groupys.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_similarity_cache", uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_similarity_cache_pair", columnNames = {"user_id", "candidate_user_id"})
}, indexes = {
        @Index(name = "idx_user_similarity_cache_user_score", columnList = "user_id,score"),
        @Index(name = "idx_user_similarity_cache_candidate", columnList = "candidate_user_id"),
        @Index(name = "idx_user_similarity_cache_expires", columnList = "expires_at")
})
public class UserSimilarityCache {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    public User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_user_id", nullable = false)
    public User candidateUser;

    @Column(nullable = false)
    public Double score;

    @Column(name = "artist_overlap_score", nullable = false)
    public Double artistOverlapScore = 0d;

    @Column(name = "genre_overlap_score", nullable = false)
    public Double genreOverlapScore = 0d;

    @Column(name = "shared_communities_score", nullable = false)
    public Double sharedCommunitiesScore = 0d;

    @Column(name = "activity_overlap_score", nullable = false)
    public Double activityOverlapScore = 0d;

    @Column(name = "country_score", nullable = false)
    public Double countryScore = 0d;

    @Column(name = "follow_graph_score", nullable = false)
    public Double followGraphScore = 0d;

    @Column(name = "embedding_score", nullable = false)
    public Double embeddingScore = 0d;

    @Column(name = "primary_reason_code")
    public String primaryReasonCode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "explanation_json", columnDefinition = "jsonb")
    public String explanationJson;

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
