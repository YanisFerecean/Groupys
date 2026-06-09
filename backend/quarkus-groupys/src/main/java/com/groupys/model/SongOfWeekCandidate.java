package com.groupys.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/** A member-submitted track candidate in a weekly community poll (ticket 6.4). */
@Entity
@Table(name = "song_of_week_candidates", uniqueConstraints = {
        @UniqueConstraint(name = "uk_song_week_candidate_track", columnNames = {"poll_id", "track_key"})
}, indexes = {
        @Index(name = "idx_song_week_candidate_poll", columnList = "poll_id, created_at")
})
public class SongOfWeekCandidate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "poll_id", nullable = false)
    public SongOfWeekPoll poll;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by", nullable = false)
    public User submittedBy;

    @Column(name = "track_key", nullable = false, length = 255)
    public String trackKey;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "track_payload", nullable = false, columnDefinition = "jsonb")
    public String trackPayload;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
