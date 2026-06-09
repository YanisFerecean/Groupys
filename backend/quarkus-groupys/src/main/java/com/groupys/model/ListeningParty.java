package com.groupys.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/** Scheduled position-sync party for a conversation (ticket 6.2). */
@Entity
@Table(name = "listening_parties", indexes = {
        @Index(name = "idx_listening_party_due", columnList = "status, start_at"),
        @Index(name = "idx_listening_party_conversation", columnList = "conversation_id, start_at DESC")
})
public class ListeningParty {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    public Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "host_id", nullable = false)
    public User host;

    @Column(name = "start_at", nullable = false)
    public Instant startAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "track_payload", nullable = false, columnDefinition = "jsonb")
    public String trackPayload;

    @Column(name = "status", nullable = false, length = 16)
    public String status = "SCHEDULED";

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @Column(name = "updated_at", nullable = false)
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
