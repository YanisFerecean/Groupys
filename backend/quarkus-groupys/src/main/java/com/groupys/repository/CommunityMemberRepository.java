package com.groupys.repository;

import com.groupys.model.CommunityMember;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class CommunityMemberRepository implements PanacheRepositoryBase<CommunityMember, UUID> {

    public Optional<CommunityMember> findByUserAndCommunity(UUID userId, UUID communityId) {
        return find("user.id = ?1 and community.id = ?2", userId, communityId).firstResultOptional();
    }

    public List<CommunityMember> findByCommunity(UUID communityId) {
        return find("community.id", communityId).list();
    }

    public List<CommunityMember> findByUser(UUID userId) {
        return find("user.id", userId).list();
    }

    public long countSharedMembers(UUID candidateCommunityId, List<UUID> joinedCommunityIds) {
        if (joinedCommunityIds == null || joinedCommunityIds.isEmpty()) {
            return 0L;
        }
        return getEntityManager().createQuery("""
                select count(distinct candidate.user.id)
                from CommunityMember candidate
                where candidate.community.id = :candidateCommunityId
                  and exists (
                    select 1
                    from CommunityMember joined
                    where joined.user.id = candidate.user.id
                      and joined.community.id in :joinedCommunityIds
                  )
                """, Long.class)
                .setParameter("candidateCommunityId", candidateCommunityId)
                .setParameter("joinedCommunityIds", joinedCommunityIds)
                .getSingleResult();
    }

    public List<UUID> findTrendingCommunityIds(Instant since, int limit) {
        return getEntityManager().createQuery("""
                select cm.community.id
                from CommunityMember cm
                where cm.joinedAt >= :since
                group by cm.community.id
                order by count(cm) desc
                """, UUID.class)
                .setParameter("since", since)
                .setMaxResults(limit)
                .getResultList();
    }

    public long countSharedCommunities(UUID userId, UUID candidateUserId) {
        return getEntityManager().createQuery("""
                select count(distinct mine.community.id)
                from CommunityMember mine
                where mine.user.id = :userId
                  and exists (
                    select 1
                    from CommunityMember theirs
                    where theirs.user.id = :candidateUserId
                      and theirs.community.id = mine.community.id
                  )
                """, Long.class)
                .setParameter("userId", userId)
                .setParameter("candidateUserId", candidateUserId)
                .getSingleResult();
    }
}
