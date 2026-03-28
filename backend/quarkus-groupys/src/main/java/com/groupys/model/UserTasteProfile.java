package com.groupys.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_taste_profile", uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_taste_profile_user", columnNames = "user_id")
}, indexes = {
        @Index(name = "idx_user_taste_profile_refreshed", columnList = "refreshed_at"),
        @Index(name = "idx_user_taste_profile_country", columnList = "country_code")
})
public class UserTasteProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    public User user;

    @Column(name = "profile_version", nullable = false)
    public int profileVersion = 1;

    @Column(name = "top_artists_count", nullable = false)
    public int topArtistsCount;

    @Column(name = "top_genres_count", nullable = false)
    public int topGenresCount;

    @Column(name = "top_tracks_count", nullable = false)
    public int topTracksCount;

    @Column(name = "joined_communities_count", nullable = false)
    public int joinedCommunitiesCount;

    @Column(name = "music_activity_score", nullable = false)
    public Double musicActivityScore = 0d;

    @Column(name = "community_activity_score", nullable = false)
    public Double communityActivityScore = 0d;

    @Column(name = "artist_entropy_score")
    public Double artistEntropyScore;

    @Column(name = "genre_entropy_score")
    public Double genreEntropyScore;

    @Column(name = "country_code", length = 2)
    public String countryCode;

    @Column(name = "taste_summary_text", columnDefinition = "TEXT")
    public String tasteSummaryText;

    @Column(name = "embedding_status", nullable = false)
    public String embeddingStatus = "NONE";

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
