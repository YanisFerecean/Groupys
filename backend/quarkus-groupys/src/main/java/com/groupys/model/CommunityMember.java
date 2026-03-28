package com.groupys.model;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "community_members", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"community_id", "user_id"})
}, indexes = {
        @Index(name = "idx_community_members_user_joined", columnList = "user_id,joined_at"),
        @Index(name = "idx_community_members_community_joined", columnList = "community_id,joined_at")
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

    @Column(nullable = false, length = 20)
    @ColumnDefault("'USER_JOIN'")
    public String source = "USER_JOIN";

    @Column(name = "last_active_at")
    public Instant lastActiveAt;

    @Column(name = "joined_at", nullable = false, updatable = false)
    public Instant joinedAt;

    @PrePersist
    void onPersist() {
        if (joinedAt == null) {
            joinedAt = Instant.now();
        }
        if (lastActiveAt == null) {
            lastActiveAt = joinedAt;
        }
    }
}
