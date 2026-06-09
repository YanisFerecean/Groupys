package com.groupys.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/** An emoji reaction on a message (chat × music plan, ticket 3.2). */
@Entity
@Table(name = "message_reactions", uniqueConstraints = {
        @UniqueConstraint(name = "uk_message_reaction", columnNames = {"message_id", "user_id", "emoji"})
}, indexes = {
        @Index(name = "idx_message_reaction_message", columnList = "message_id")
})
public class MessageReaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "message_id", nullable = false)
    public UUID messageId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    public User user;

    @Column(name = "emoji", length = 16, nullable = false)
    public String emoji;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
