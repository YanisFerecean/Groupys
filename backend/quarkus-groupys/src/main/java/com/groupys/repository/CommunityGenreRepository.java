package com.groupys.repository;

import com.groupys.model.CommunityGenre;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class CommunityGenreRepository implements PanacheRepositoryBase<CommunityGenre, UUID> {

    public List<CommunityGenre> findByCommunity(UUID communityId) {
        return find("community.id = ?1 order by normalizedScore desc", communityId).list();
    }

    public void deleteByCommunity(UUID communityId) {
        delete("community.id", communityId);
    }
}
