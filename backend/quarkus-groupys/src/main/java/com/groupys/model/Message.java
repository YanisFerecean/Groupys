package com.groupys.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "messages")
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    public Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    public User sender;

    @Column(columnDefinition = "TEXT")
    public String content;

    @Column(name = "message_type", length = 20)
    public String messageType = "text";

    @Column(name = "media_url", length = 500)
    public String mediaUrl;

    @Column(name = "reply_to_id")
    public UUID replyToId;

    @Column(name = "is_deleted")
    public boolean isDeleted = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt;

    @Column(name = "updated_at")
    public Instant updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
