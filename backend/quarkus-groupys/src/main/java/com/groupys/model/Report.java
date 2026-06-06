package com.groupys.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reports", indexes = {
        @Index(name = "idx_reports_status_created", columnList = "status, created_at"),
        @Index(name = "idx_reports_reporter", columnList = "reporter_id"),
        @Index(name = "idx_reports_target", columnList = "target_type, target_id")
})
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    /** The user who filed the report. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    public User reporter;

    @Column(name = "target_type", nullable = false, length = 16)
    @Enumerated(EnumType.STRING)
    public TargetType targetType;

    /** ID of the reported entity (user / message / post / community). */
    @Column(name = "target_id", nullable = false)
    public UUID targetId;

    @Column(name = "reason", nullable = false, length = 32)
    @Enumerated(EnumType.STRING)
    public Reason reason;

    @Column(name = "details", columnDefinition = "TEXT")
    public String details;

    /** PENDING | REVIEWED | ACTIONED | DISMISSED */
    @Column(name = "status", nullable = false, length = 16)
    public String status = "PENDING";

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt;

    @PrePersist
    void onPersist() {
        if (createdAt == null) createdAt = Instant.now();
    }

    public enum TargetType {
        USER, MESSAGE, POST, COMMUNITY
    }

    public enum Reason {
        HARASSMENT, SPAM, INAPPROPRIATE_CONTENT, IMPERSONATION, OTHER
    }
}
