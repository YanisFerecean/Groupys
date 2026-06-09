package com.groupys.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/** A pinned message within a conversation (chat × music plan, ticket 3.4). */
@Entity
@Table(name = "conversation_pins", uniqueConstraints = {
        @UniqueConstraint(name = "uk_conversation_pin", columnNames = {"conversation_id", "message_id"})
}, indexes = {
        @Index(name = "idx_conversation_pin_conv", columnList = "conversation_id")
})
public class ConversationPin {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "conversation_id", nullable = false)
    public UUID conversationId;

    @Column(name = "message_id", nullable = false)
    public UUID messageId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pinned_by", nullable = false)
    public User pinnedBy;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
