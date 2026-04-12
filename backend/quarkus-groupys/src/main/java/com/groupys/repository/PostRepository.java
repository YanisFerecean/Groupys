package com.groupys.repository;

import com.groupys.model.Post;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class PostRepository implements PanacheRepositoryBase<Post, UUID> {

    public List<Post> findByCommunity(UUID communityId) {
        return find("community.id", Sort.descending("createdAt"), communityId).list();
    }

    public List<Post> findByCommunityPaged(UUID communityId, int page, int size) {
        return find("community.id", Sort.descending("createdAt"), communityId)
                .page(page, size).list();
    }

    public List<Post> findByAuthor(UUID authorId) {
        return find("author.id", Sort.descending("createdAt"), authorId).list();
    }

    public List<Post> findByAuthorPaged(UUID authorId, int page, int size) {
        return find("author.id", Sort.descending("createdAt"), authorId)
                .page(page, size).list();
    }

    public List<Post> findByCommunities(List<UUID> communityIds) {
        if (communityIds.isEmpty()) return List.of();
        return find("community.id in ?1 order by createdAt desc", communityIds).list();
    }

    public List<Post> findByCommunitiesPaged(List<UUID> communityIds, int page, int size) {
        if (communityIds.isEmpty()) return List.of();
        return find("community.id in ?1 order by createdAt desc", communityIds)
                .page(page, size).list();
    }

    public List<Post> findByCommunitiesRecentLimited(List<UUID> communityIds, int limit) {
        if (communityIds.isEmpty()) return List.of();
        return find("community.id in ?1 order by createdAt desc", communityIds)
                .page(0, limit).list();
    }

    public long countByAuthor(UUID authorId) {
        return count("author.id", authorId);
    }

    public long countByCommunity(UUID communityId) {
        return count("community.id", communityId);
    }
}
