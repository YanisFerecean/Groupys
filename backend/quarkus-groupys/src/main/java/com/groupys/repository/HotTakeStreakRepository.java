package com.groupys.repository;

import com.groupys.model.HotTakeStreak;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class HotTakeStreakRepository implements PanacheRepositoryBase<HotTakeStreak, UUID> {

    public Optional<HotTakeStreak> findByUser(UUID userId) {
        return find("user.id", userId).firstResultOptional();
    }

    /** Users with a live streak who have not answered yet today — at risk of breaking it. */
    public List<HotTakeStreak> findAtRisk(LocalDate today, int limit) {
        return find("currentStreak >= 1 and (lastAnswerDate is null or lastAnswerDate < ?1)", today)
                .page(0, limit)
                .list();
    }
}
