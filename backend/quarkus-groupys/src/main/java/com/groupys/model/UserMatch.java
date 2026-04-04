package com.groupys.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_matches", uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_matches_pair", columnNames = {"user_a_id", "user_b_id"})
}, indexes = {
        @Index(name = "idx_user_matches_user_a", columnList = "user_a_id,status"),
        @Index(name = "idx_user_matches_user_b", columnList = "user_b_id,status"),
        @Index(name = "idx_user_matches_conversation", columnList = "conversation_id")
})
public class UserMatch {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    /**
     * The user whose UUID is smaller (canonical ordering ensures the unique constraint
     * works regardless of which side initiated the match).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_a_id", nullable = false)
    public User userA;

    /**
     * The user whose UUID is larger (canonical ordering).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_b_id", nullable = false)
    public User userB;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id")
    public Conversation conversation;

    /**
     * ACTIVE | UNMATCHED | USER_A_HIDDEN | USER_B_HIDDEN
     */
    @Column(nullable = false)
    public String status = "ACTIVE";

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt;

    @PrePersist
    void onPersist() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
