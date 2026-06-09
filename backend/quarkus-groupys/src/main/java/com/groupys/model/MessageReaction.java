package com.groupys.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/** A typed emoji or track reaction on a message (tickets 3.2 / 4.5). */
@Entity
@Table(name = "message_reactions", uniqueConstraints = {
        @UniqueConstraint(name = "uk_message_reaction_value",
                columnNames = {"message_id", "user_id", "reaction_type", "reaction_key"})
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

    @Column(name = "reaction_type", length = 16, nullable = false)
    public String reactionType = "emoji";

    @Column(name = "reaction_key", length = 255, nullable = false)
    public String reactionKey;

    @Column(name = "emoji", length = 16)
    public String emoji;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "track_payload", columnDefinition = "jsonb")
    public String trackPayload;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
