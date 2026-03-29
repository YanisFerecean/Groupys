package com.groupys.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "friendships",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_friendship_pair",
        columnNames = {"requester_id", "recipient_id"}
    ),
    indexes = {
        @Index(name = "idx_friendship_requester_status", columnList = "requester_id,status"),
        @Index(name = "idx_friendship_recipient_status", columnList = "recipient_id,status")
    }
)
public class Friendship {

    public enum Status { PENDING, ACCEPTED }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requester_id", nullable = false)
    public User requester;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id", nullable = false)
    public User recipient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    public Status status = Status.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt;

    @Column(name = "updated_at")
    public Instant updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
