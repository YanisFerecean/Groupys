package com.groupys.model;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Daily hot-take answering streak per user — drives the "🔥 N-day streak" retention loop.
 * Updated in HotTakeService.submitAnswer().
 */
@Entity
@Table(name = "hot_take_streaks", indexes = {
    @Index(name = "idx_hot_take_streaks_user_id", columnList = "user_id", unique = true)
})
public class HotTakeStreak {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    public User user;

    @Column(name = "current_streak", nullable = false)
    @ColumnDefault("0")
    public int currentStreak = 0;

    @Column(name = "longest_streak", nullable = false)
    @ColumnDefault("0")
    public int longestStreak = 0;

    /** Local date of the user's most recent answer; used to compute streak continuity. */
    @Column(name = "last_answer_date")
    public LocalDate lastAnswerDate;
}
