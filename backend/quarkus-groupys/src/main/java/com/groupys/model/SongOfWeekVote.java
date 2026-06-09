package com.groupys.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/** Reaction-style vote; one selected candidate per member and poll (ticket 6.4). */
@Entity
@Table(name = "song_of_week_votes", uniqueConstraints = {
        @UniqueConstraint(name = "uk_song_week_vote", columnNames = {"poll_id", "user_id"})
}, indexes = {
        @Index(name = "idx_song_week_vote_candidate", columnList = "candidate_id")
})
public class SongOfWeekVote {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "poll_id", nullable = false)
    public SongOfWeekPoll poll;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    public SongOfWeekCandidate candidate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    public User user;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
