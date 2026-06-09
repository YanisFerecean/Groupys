package com.groupys.repository;

import com.groupys.model.SongOfWeekCandidate;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class SongOfWeekCandidateRepository implements PanacheRepositoryBase<SongOfWeekCandidate, UUID> {

    public SongOfWeekCandidate findOne(UUID pollId, String trackKey) {
        return find("poll.id = ?1 and trackKey = ?2", pollId, trackKey).firstResult();
    }

    public List<SongOfWeekCandidate> findByPoll(UUID pollId) {
        return find("poll.id = ?1 order by createdAt", pollId).list();
    }
}
