package com.groupys.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Records that one user viewed another's profile. Powers the "👀 N people viewed your profile"
 * retention teaser (counts only — viewer identities are never pushed).
 */
@Entity
@Table(name = "profile_views", indexes = {
    @Index(name = "idx_profile_views_viewed_created", columnList = "viewed_id,created_at"),
    @Index(name = "idx_profile_views_viewer_id", columnList = "viewer_id")
})
public class ProfileView {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "viewer_id", nullable = false)
    public User viewer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "viewed_id", nullable = false)
    public User viewed;

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt;

    @PrePersist
    void onPersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
