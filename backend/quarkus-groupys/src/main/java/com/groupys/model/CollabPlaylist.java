package com.groupys.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/** Server-built collaborative playlist attached to one conversation (ticket 6.1). */
@Entity
@Table(name = "collab_playlists", uniqueConstraints = {
        @UniqueConstraint(name = "uk_collab_playlist_conversation", columnNames = "conversation_id")
})
public class CollabPlaylist {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    public Conversation conversation;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", unique = true)
    public Message message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    public User createdBy;

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
