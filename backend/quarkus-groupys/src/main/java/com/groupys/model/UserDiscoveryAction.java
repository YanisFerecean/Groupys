package com.groupys.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_discovery_action", indexes = {
        @Index(name = "idx_user_discovery_action_user_target_action", columnList = "user_id,target_type,action_type,created_at"),
        @Index(name = "idx_user_discovery_action_target_user", columnList = "target_user_id,action_type,created_at"),
        @Index(name = "idx_user_discovery_action_target_community", columnList = "target_community_id,action_type,created_at")
})
public class UserDiscoveryAction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    public User user;

    @Column(name = "target_type", nullable = false)
    public String targetType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_user_id")
    public User targetUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_community_id")
    public Community targetCommunity;

    @Column(name = "action_type", nullable = false)
    public String actionType;

    @Column(nullable = false)
    public String surface;

    @Column(name = "reason_code")
    public String reasonCode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata_json", columnDefinition = "jsonb")
    public String metadataJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt;

    @Column(name = "expires_at")
    public Instant expiresAt;

    @PrePersist
    void onPersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
