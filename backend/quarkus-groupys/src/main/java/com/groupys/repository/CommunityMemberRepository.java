package com.groupys.repository;

import com.groupys.model.CommunityMember;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

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
}
