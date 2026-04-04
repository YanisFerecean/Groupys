package com.groupys.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "artist_genre", uniqueConstraints = {
        @UniqueConstraint(name = "uk_artist_genre_source", columnNames = {"artist_id", "genre_id", "source"})
}, indexes = {
        @Index(name = "idx_artist_genre_artist_conf", columnList = "artist_id,confidence"),
        @Index(name = "idx_artist_genre_genre_conf", columnList = "genre_id,confidence")
})
public class ArtistGenre {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "artist_id", nullable = false)
    public Artist artist;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "genre_id", nullable = false)
    public Genre genre;

    @Column(nullable = false)
    public String source;

    @Column(nullable = false)
    public Double confidence;

    @Column(name = "is_primary", nullable = false)
    public boolean primary;

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt;

    @PrePersist
    void onPersist() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
