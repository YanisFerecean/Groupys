package com.groupys.repository;

import com.groupys.model.UserFollow;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class UserFollowRepository implements PanacheRepositoryBase<UserFollow, UUID> {

    public Optional<UserFollow> findByFollowerAndFollowed(UUID followerUserId, UUID followedUserId) {
        return find("followerUser.id = ?1 and followedUser.id = ?2", followerUserId, followedUserId)
                .firstResultOptional();
    }

    public List<UserFollow> findActiveByFollower(UUID followerUserId) {
        return find("followerUser.id = ?1 and status = 'ACTIVE'", followerUserId).list();
    }

    public long countMutualFollowers(UUID userId, UUID candidateUserId) {
        return getEntityManager().createQuery("""
                select count(distinct mine.followedUser.id)
                from UserFollow mine
                where mine.followerUser.id = :userId
                  and mine.status = 'ACTIVE'
                  and exists (
                    select 1
                    from UserFollow theirs
                    where theirs.followerUser.id = :candidateUserId
                      and theirs.status = 'ACTIVE'
                      and theirs.followedUser.id = mine.followedUser.id
                  )
                """, Long.class)
                .setParameter("userId", userId)
                .setParameter("candidateUserId", candidateUserId)
                .getSingleResult();
    }

    public long countFollowers(UUID userId) {
        return find("followedUser.id = ?1 and status = 'ACTIVE'", userId).count();
    }

    public long countFollowing(UUID userId) {
        return find("followerUser.id = ?1 and status = 'ACTIVE'", userId).count();
    }
}
