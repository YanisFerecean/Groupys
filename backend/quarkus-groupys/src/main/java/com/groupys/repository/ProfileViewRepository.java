package com.groupys.repository;

import com.groupys.model.ProfileView;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ProfileViewRepository implements PanacheRepositoryBase<ProfileView, UUID> {

    /** Rows of [viewedUserId, distinctViewerCount] for profiles viewed since the cutoff. */
    public List<Object[]> viewedWithCountsSince(Instant since) {
        return getEntityManager().createQuery("""
                select v.viewed.id, count(distinct v.viewer.id)
                from ProfileView v
                where v.createdAt >= :since
                group by v.viewed.id
                """, Object[].class)
                .setParameter("since", since)
                .getResultList();
    }

    /** Distinct viewers of a profile since a cutoff — the teaser count. */
    public long countDistinctViewersSince(UUID viewedId, Instant since) {
        return getEntityManager().createQuery("""
                select count(distinct v.viewer.id)
                from ProfileView v
                where v.viewed.id = :viewedId and v.createdAt >= :since
                """, Long.class)
                .setParameter("viewedId", viewedId)
                .setParameter("since", since)
                .getSingleResult();
    }
}
