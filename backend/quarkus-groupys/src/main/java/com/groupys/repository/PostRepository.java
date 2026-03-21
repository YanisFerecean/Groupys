package com.groupys.repository;

import com.groupys.model.Post;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class PostRepository implements PanacheRepositoryBase<Post, UUID> {

    public List<Post> findByCommunity(UUID communityId) {
        return find("community.id", io.quarkus.panache.common.Sort.descending("createdAt"), communityId).list();
    }

    public List<Post> findByAuthor(UUID authorId) {
        return find("author.id", io.quarkus.panache.common.Sort.descending("createdAt"), authorId).list();
    }
}
