package com.groupys.repository;

import com.groupys.model.CommunityTasteProfile;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class CommunityTasteProfileRepository implements PanacheRepositoryBase<CommunityTasteProfile, UUID> {

    public Optional<CommunityTasteProfile> findByCommunityId(UUID communityId) {
        return find("community.id", communityId).firstResultOptional();
    }
}
