package com.groupys.repository;

import com.groupys.model.CommunityMember;
import com.groupys.model.User;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
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

    public List<CommunityMember> findByUserLimited(UUID userId, int limit) {
        return find("user.id = ?1 order by joinedAt desc", userId)
                .page(0, limit)
                .list();
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

    public List<User> findFriendsInCommunity(UUID communityId, Set<UUID> friendIds, int limit) {
        if (friendIds == null || friendIds.isEmpty()) return List.of();
        return getEntityManager().createQuery("""
                select cm.user
                from CommunityMember cm
                where cm.community.id = :communityId
                  and cm.user.id in :friendIds
                order by cm.joinedAt desc
                """, User.class)
                .setParameter("communityId", communityId)
                .setParameter("friendIds", new ArrayList<>(friendIds))
                .setMaxResults(limit)
                .getResultList();
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
