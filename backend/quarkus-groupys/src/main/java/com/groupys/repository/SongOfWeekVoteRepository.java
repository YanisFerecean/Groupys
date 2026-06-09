package com.groupys.repository;

import com.groupys.model.SongOfWeekVote;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class SongOfWeekVoteRepository implements PanacheRepositoryBase<SongOfWeekVote, UUID> {

    public SongOfWeekVote findByPollAndUser(UUID pollId, UUID userId) {
        return find("poll.id = ?1 and user.id = ?2", pollId, userId).firstResult();
    }

    public long countByCandidate(UUID candidateId) {
        return count("candidate.id = ?1", candidateId);
    }

    public List<Object[]> countsByPoll(UUID pollId) {
        return getEntityManager().createQuery("""
                select vote.candidate.id, count(vote)
                from SongOfWeekVote vote
                where vote.poll.id = :pollId
                group by vote.candidate.id
                """, Object[].class)
                .setParameter("pollId", pollId)
                .getResultList();
    }
}
