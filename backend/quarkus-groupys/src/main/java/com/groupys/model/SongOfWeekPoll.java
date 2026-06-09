package com.groupys.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** One weekly song poll per community, retaining the pinned winner recap (ticket 6.4). */
@Entity
@Table(name = "song_of_week_polls", uniqueConstraints = {
        @UniqueConstraint(name = "uk_song_week_community", columnNames = {"community_id", "week_start"})
}, indexes = {
        @Index(name = "idx_song_week_status", columnList = "status, week_start")
})
public class SongOfWeekPoll {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "community_id", nullable = false)
    public Community community;

    @Column(name = "week_start", nullable = false)
    public LocalDate weekStart;

    @Column(name = "status", nullable = false, length = 16)
    public String status = "OPEN";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "winner_candidate_id")
    public SongOfWeekCandidate winnerCandidate;

    @Column(name = "recap", columnDefinition = "TEXT")
    public String recap;

    @Column(name = "pinned_at")
    public Instant pinnedAt;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @Column(name = "closed_at")
    public Instant closedAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
