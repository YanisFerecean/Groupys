package com.groupys.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "music_source_snapshot", indexes = {
        @Index(name = "idx_music_snapshot_user_source_type", columnList = "user_id,source,snapshot_type,fetched_at"),
        @Index(name = "idx_music_snapshot_status", columnList = "processing_status,fetched_at")
})
public class MusicSourceSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    public User user;

    @Column(nullable = false)
    public String source;

    @Column(name = "snapshot_type", nullable = false)
    public String snapshotType;

    @Column(name = "source_account_id")
    public String sourceAccountId;

    @Column(name = "source_cursor")
    public String sourceCursor;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload_json", nullable = false, columnDefinition = "jsonb")
    public String payloadJson;

    @Column(name = "fetched_at", nullable = false)
    public Instant fetchedAt;

    @Column(name = "expires_at")
    public Instant expiresAt;

    @Column(name = "processing_status", nullable = false)
    public String processingStatus = "PENDING";

    @Column(name = "processing_error", columnDefinition = "TEXT")
    public String processingError;

    @PrePersist
    void onPersist() {
        if (fetchedAt == null) {
            fetchedAt = Instant.now();
        }
    }
}
