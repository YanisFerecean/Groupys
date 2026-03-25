package com.groupys.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "conversation_participants",
    uniqueConstraints = @UniqueConstraint(columnNames = {"conversation_id", "user_id"})
)
public class ConversationParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    public Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    public User user;

    @Column(name = "joined_at", nullable = false, updatable = false)
    public Instant joinedAt;

    @Column(name = "last_read_at")
    public Instant lastReadAt;

    @PrePersist
    void onCreate() {
        joinedAt = Instant.now();
        lastReadAt = Instant.now();
    }
}
