package com.groupys.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_likes", uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_likes_pair", columnNames = {"from_user_id", "to_user_id"})
}, indexes = {
        @Index(name = "idx_user_likes_from_user", columnList = "from_user_id,created_at"),
        @Index(name = "idx_user_likes_to_user", columnList = "to_user_id,created_at")
})
public class UserLike {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_user_id", nullable = false)
    public User fromUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_user_id", nullable = false)
    public User toUser;

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt;

    @Column(name = "expires_at")
    public Instant expiresAt;

    @PrePersist
    void onPersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
