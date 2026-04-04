package com.groupys.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_follow", uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_follow_pair", columnNames = {"follower_user_id", "followed_user_id"})
}, indexes = {
        @Index(name = "idx_user_follow_follower_status", columnList = "follower_user_id,status"),
        @Index(name = "idx_user_follow_followed_status", columnList = "followed_user_id,status")
})
public class UserFollow {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "follower_user_id", nullable = false)
    public User followerUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "followed_user_id", nullable = false)
    public User followedUser;

    @Column(nullable = false)
    public String status = "ACTIVE";

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
