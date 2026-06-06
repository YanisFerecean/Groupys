package com.groupys.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_blocks", uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_blocks_pair", columnNames = {"blocker_id", "blocked_id"})
}, indexes = {
        @Index(name = "idx_user_blocks_blocker", columnList = "blocker_id"),
        @Index(name = "idx_user_blocks_blocked", columnList = "blocked_id")
})
public class UserBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    /** The user who initiated the block. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blocker_id", nullable = false)
    public User blocker;

    /** The user who was blocked. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blocked_id", nullable = false)
    public User blocked;

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt;

    @PrePersist
    void onPersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
