package com.groupys.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "community_members", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"community_id", "user_id"})
})
public class CommunityMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "community_id", nullable = false)
    public Community community;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    public User user;

    @Column(nullable = false)
    public String role = "member";

    @Column(name = "joined_at", nullable = false, updatable = false)
    public Instant joinedAt;

    @PrePersist
    void onPersist() {
        if (joinedAt == null) {
            joinedAt = Instant.now();
        }
    }
}
