package com.groupys.repository;

import com.groupys.model.Comment;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class CommentRepository implements PanacheRepositoryBase<Comment, UUID> {

    public List<Comment> findByPost(UUID postId) {
        return find("post.id", postId).list();
    }

    public long countByPost(UUID postId) {
        return count("post.id", postId);
    }

    public List<Comment> findByParent(UUID parentCommentId) {
        return find("parentComment.id", parentCommentId).list();
    }

    public long countByAuthor(UUID authorId) {
        return count("author.id", authorId);
    }

    public long countByCommunity(UUID communityId) {
        return count("post.community.id", communityId);
    }
}
