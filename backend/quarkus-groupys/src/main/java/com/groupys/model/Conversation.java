package com.groupys.model;

import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;


@Entity
@Table(name = "conversations")
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "is_group")
    public boolean isGroup = false;

    @Column(name = "group_name", length = 100)
    public String groupName;

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt;

    @Column(name = "updated_at")
    public Instant updatedAt;

    @Column(name = "last_message_at")
    public Instant lastMessageAt;

    @Column(name = "last_message_preview", columnDefinition = "TEXT")
    public String lastMessagePreview;

    @Column(name = "request_status", length = 32)
    public String requestStatus = "ACCEPTED";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by_user_id")
    public User requestedByUser;

    @Column(name = "accepted_at")
    public Instant acceptedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id")
    public UserMatch match;

    @OneToMany(mappedBy = "conversation", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @BatchSize(size = 50)
    public List<ConversationParticipant> participants = new ArrayList<>();

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
        if (acceptedAt == null && "ACCEPTED".equals(requestStatus)) {
            acceptedAt = createdAt;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
        if (acceptedAt == null && "ACCEPTED".equals(requestStatus)) {
            acceptedAt = updatedAt;
        }
    }
}
