package com.groupys.repository;

import com.groupys.model.CommunityArtist;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class CommunityArtistRepository implements PanacheRepositoryBase<CommunityArtist, UUID> {

    public List<CommunityArtist> findByCommunity(UUID communityId) {
        return find("community.id = ?1 order by normalizedScore desc", communityId).list();
    }

    public void deleteByCommunity(UUID communityId) {
        delete("community.id", communityId);
    }
}
