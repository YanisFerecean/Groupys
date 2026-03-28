package com.groupys.service;

import com.groupys.dto.CommentResDto;
import com.groupys.model.Comment;
import com.groupys.model.CommentReaction;
import com.groupys.model.Post;
import com.groupys.model.User;
import com.groupys.repository.CommentReactionRepository;
import com.groupys.repository.CommentRepository;
import com.groupys.repository.PostRepository;
import com.groupys.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;

import java.util.*;
import java.util.stream.Collectors;

@ApplicationScoped
public class CommentService {

    @Inject
    CommentRepository commentRepository;

    @Inject
    CommentReactionRepository commentReactionRepository;

    @Inject
    PostRepository postRepository;

    @Inject
    UserRepository userRepository;

    @Inject
    DiscoveryService discoveryService;

    public List<CommentResDto> getByPost(UUID postId, String clerkId) {
        User user = userRepository.findByClerkId(clerkId).orElse(null);
        List<Comment> all = commentRepository.findByPost(postId);

        // Group by parent
        Map<UUID, List<Comment>> byParent = new HashMap<>();
        List<Comment> topLevel = new ArrayList<>();
        for (Comment c : all) {
            if (c.parentComment == null) {
                topLevel.add(c);
            } else {
                byParent.computeIfAbsent(c.parentComment.id, k -> new ArrayList<>()).add(c);
            }
        }

        return buildTree(topLevel, byParent, user);
    }

    private List<CommentResDto> buildTree(List<Comment> comments, Map<UUID, List<Comment>> byParent, User user) {
        return comments.stream()
                .map(c -> {
                    List<Comment> children = byParent.getOrDefault(c.id, List.of());
                    List<CommentResDto> replies = buildTree(children, byParent, user);
                    return toDto(c, user, replies);
                })
                .sorted(Comparator.comparingLong(CommentResDto::likeCount).reversed()
                        .thenComparing(CommentResDto::createdAt))
                .collect(Collectors.toList());
    }

    @Transactional
    public CommentResDto create(UUID postId, String content, UUID parentCommentId, String clerkId) {
        User author = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        Post post = postRepository.findByIdOptional(postId)
                .orElseThrow(() -> new NotFoundException("Post not found"));

        Comment comment = new Comment();
        comment.content = content;
        comment.post = post;
        comment.author = author;

        if (parentCommentId != null) {
            Comment parent = commentRepository.findByIdOptional(parentCommentId)
                    .orElseThrow(() -> new NotFoundException("Parent comment not found"));
            comment.parentComment = parent;
        }

        commentRepository.persist(comment);
        discoveryService.refreshAfterCommunityActivity(post.community.id);
        return toDto(comment, author, List.of());
    }

    @Transactional
    public CommentResDto react(UUID commentId, String reactionType, String clerkId) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        Comment comment = commentRepository.findByIdOptional(commentId)
                .orElseThrow(() -> new NotFoundException("Comment not found"));

        var existing = commentReactionRepository.findByCommentAndUser(commentId, user.id);

        if (existing.isPresent()) {
            CommentReaction reaction = existing.get();
            if (reaction.reactionType.equals(reactionType)) {
                commentReactionRepository.delete(reaction);
            } else {
                reaction.reactionType = reactionType;
            }
        } else {
            CommentReaction reaction = new CommentReaction();
            reaction.comment = comment;
            reaction.user = user;
            reaction.reactionType = reactionType;
            commentReactionRepository.persist(reaction);
        }

        discoveryService.refreshAfterCommunityActivity(comment.post.community.id);

        // Rebuild replies for this comment
        List<Comment> children = commentRepository.findByParent(commentId);
        List<CommentResDto> replies = children.stream()
                .map(c -> toDto(c, user, List.of()))
                .sorted(Comparator.comparingLong(CommentResDto::likeCount).reversed())
                .collect(Collectors.toList());

        return toDto(comment, user, replies);
    }

    @Transactional
    public void delete(UUID commentId, String clerkId) {
        Comment comment = commentRepository.findByIdOptional(commentId)
                .orElseThrow(() -> new NotFoundException("Comment not found"));
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        if (!comment.author.id.equals(user.id)) {
            throw new jakarta.ws.rs.ForbiddenException("Not the author");
        }
        UUID communityId = comment.post.community.id;
        deleteRecursive(comment);
        discoveryService.refreshAfterCommunityActivity(communityId);
    }

    private void deleteRecursive(Comment comment) {
        List<Comment> children = commentRepository.findByParent(comment.id);
        for (Comment child : children) {
            deleteRecursive(child);
        }
        commentReactionRepository.delete("comment.id", comment.id);
        commentRepository.delete(comment);
    }

    public void deleteAllByPost(UUID postId) {
        List<Comment> all = commentRepository.findByPost(postId);
        for (Comment c : all) {
            commentReactionRepository.delete("comment.id", c.id);
        }
        commentRepository.delete("post.id", postId);
    }

    private CommentResDto toDto(Comment comment, User currentUser, List<CommentResDto> replies) {
        long likes = commentReactionRepository.countByCommentAndType(comment.id, "like");
        long dislikes = commentReactionRepository.countByCommentAndType(comment.id, "dislike");
        String userReaction = null;
        if (currentUser != null) {
            userReaction = commentReactionRepository.findByCommentAndUser(comment.id, currentUser.id)
                    .map(r -> r.reactionType)
                    .orElse(null);
        }
        return new CommentResDto(
                comment.id,
                comment.content,
                comment.post.id,
                comment.parentComment != null ? comment.parentComment.id : null,
                comment.author.id,
                comment.author.username,
                comment.author.displayName,
                comment.author.profileImage,
                comment.createdAt,
                likes,
                dislikes,
                userReaction,
                replies
        );
    }
}
