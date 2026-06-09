package com.groupys.repository;

import com.groupys.model.SongOfWeekPoll;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class SongOfWeekPollRepository implements PanacheRepositoryBase<SongOfWeekPoll, UUID> {

    public SongOfWeekPoll findForWeek(UUID communityId, LocalDate weekStart) {
        return find("community.id = ?1 and weekStart = ?2", communityId, weekStart).firstResult();
    }

    public SongOfWeekPoll findLatestClosed(UUID communityId) {
        return find("community.id = ?1 and status = 'CLOSED' order by weekStart desc",
                communityId).firstResult();
    }

    public List<SongOfWeekPoll> findExpiredOpen(LocalDate currentWeekStart) {
        return find("status = 'OPEN' and weekStart < ?1 order by weekStart", currentWeekStart).list();
    }
}
