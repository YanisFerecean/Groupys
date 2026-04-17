package com.groupys.service;

import com.groupys.config.PerformanceFeatureFlags;
import com.groupys.dto.CommentResDto;
import com.groupys.model.Comment;
import com.groupys.model.CommentReaction;
import com.groupys.model.Post;
import com.groupys.model.User;
import com.groupys.repository.CommentReactionRepository;
import com.groupys.repository.CommentRepository;
import com.groupys.repository.CommunityMemberRepository;
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
    CommunityMemberRepository communityMemberRepository;

    @Inject
    DiscoveryService discoveryService;

    @Inject
    PerformanceFeatureFlags flags;

    public List<CommentResDto> getByPost(UUID postId, String clerkId) {
        User user = userRepository.findByClerkId(clerkId).orElse(null);
        List<Comment> all = commentRepository.findByPost(postId);
        if (all.isEmpty()) return List.of();

        List<UUID> commentIds = all.stream().map(c -> c.id).toList();
        Map<UUID, Long> likesMap = Map.of();
        Map<UUID, Long> dislikesMap = Map.of();
        if (!readModelReadEnabled()) {
            // Batch-load reaction data from reactions table when read-model counters are disabled.
            likesMap = commentReactionRepository.countsByCommentIdsAndType(commentIds, "like");
            dislikesMap = commentReactionRepository.countsByCommentIdsAndType(commentIds, "dislike");
        }
        Map<UUID, String> userReactionMap = user != null
                ? commentReactionRepository.findUserReactionsByCommentIds(commentIds, user.id)
                : Map.of();

        // Group by parent in memory
        Map<UUID, List<Comment>> byParent = new HashMap<>();
        List<Comment> topLevel = new ArrayList<>();
        for (Comment c : all) {
            if (c.parentComment == null) {
                topLevel.add(c);
            } else {
                byParent.computeIfAbsent(c.parentComment.id, k -> new ArrayList<>()).add(c);
            }
        }

        return buildTree(topLevel, byParent, user, likesMap, dislikesMap, userReactionMap);
    }

    private List<CommentResDto> buildTree(
            List<Comment> comments,
            Map<UUID, List<Comment>> byParent,
            User user,
            Map<UUID, Long> likesMap,
            Map<UUID, Long> dislikesMap,
            Map<UUID, String> userReactionMap) {
        return comments.stream()
                .map(c -> {
                    List<Comment> children = byParent.getOrDefault(c.id, List.of());
                    List<CommentResDto> replies = buildTree(children, byParent, user, likesMap, dislikesMap, userReactionMap);
                    long likes = readModelReadEnabled() ? Math.max(0L, c.likeCount) : likesMap.getOrDefault(c.id, 0L);
                    long dislikes = readModelReadEnabled() ? Math.max(0L, c.dislikeCount) : dislikesMap.getOrDefault(c.id, 0L);
                    return toDto(c, userReactionMap.get(c.id), likes, dislikes, replies);
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
            if (readModelWriteEnabled()) {
                parent.replyCount = Math.max(0L, parent.replyCount + 1L);
            }
        }

        commentRepository.persist(comment);
        if (readModelWriteEnabled()) {
            post.commentCount = Math.max(0L, post.commentCount + 1L);
        }
        discoveryService.refreshAfterCommunityActivity(post.community.id);
        return toDto(comment, null, 0L, 0L, List.of());
    }

    @Transactional
    public CommentResDto react(UUID commentId, String reactionType, String clerkId) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        Comment comment = commentRepository.findByIdOptional(commentId)
                .orElseThrow(() -> new NotFoundException("Comment not found"));
        String normalizedReaction = reactionType == null ? "" : reactionType.trim().toLowerCase();
        if (!"like".equals(normalizedReaction) && !"dislike".equals(normalizedReaction)) {
            throw new jakarta.ws.rs.BadRequestException("Reaction type must be 'like' or 'dislike'");
        }

        var existing = commentReactionRepository.findByCommentAndUser(commentId, user.id);

        if (existing.isPresent()) {
            CommentReaction reaction = existing.get();
            String oldType = reaction.reactionType == null ? "" : reaction.reactionType.toLowerCase();
            if (oldType.equals(normalizedReaction)) {
                commentReactionRepository.delete(reaction);
                applyCommentReactionDelta(comment, oldType, -1);
            } else {
                reaction.reactionType = normalizedReaction;
                applyCommentReactionDelta(comment, oldType, -1);
                applyCommentReactionDelta(comment, normalizedReaction, 1);
            }
        } else {
            CommentReaction reaction = new CommentReaction();
            reaction.comment = comment;
            reaction.user = user;
            reaction.reactionType = normalizedReaction;
            commentReactionRepository.persist(reaction);
            applyCommentReactionDelta(comment, normalizedReaction, 1);
        }

        discoveryService.refreshAfterCommunityActivity(comment.post.community.id);

        // Single-comment response — per-comment queries are acceptable here (not N+1)
        long likes = readModelReadEnabled()
                ? Math.max(0L, comment.likeCount)
                : commentReactionRepository.countByCommentAndType(commentId, "like");
        long dislikes = readModelReadEnabled()
                ? Math.max(0L, comment.dislikeCount)
                : commentReactionRepository.countByCommentAndType(commentId, "dislike");
        String userReaction = commentReactionRepository.findByCommentAndUser(commentId, user.id)
                .map(r -> r.reactionType).orElse(null);

        List<Comment> children = commentRepository.findByParent(commentId);
        List<CommentResDto> replies = children.stream()
                .map(c -> toDto(c, null, 0L, 0L, List.of()))
                .sorted(Comparator.comparingLong(CommentResDto::likeCount).reversed())
                .collect(Collectors.toList());

        return toDto(comment, userReaction, likes, dislikes, replies);
    }

    @Transactional
    public void delete(UUID commentId, String clerkId) {
        Comment comment = commentRepository.findByIdOptional(commentId)
            .orElseThrow(() -> new NotFoundException("Comment not found"));
        User user = userRepository.findByClerkId(clerkId)
            .orElseThrow(() -> new NotFoundException("User not found"));

        boolean isAuthor = comment.author.id.equals(user.id);
        boolean isCommunityModerator = communityMemberRepository.isOwnerOrModerator(user.id, comment.post.community.id);

        if (!isAuthor && !isCommunityModerator) {
            throw new jakarta.ws.rs.ForbiddenException("Not authorized to delete this comment");
        }
        UUID postId = comment.post.id;
        UUID communityId = comment.post.community.id;
        deleteRecursive(comment, postId);
        if (readModelWriteEnabled()) {
            recalculatePostCommentCounters(postId);
        }
        discoveryService.refreshAfterCommunityActivity(communityId);
    }

    /**
     * Loads all comments for the post once, collects the target comment and all its
     * descendants in memory, then issues a single batch DELETE per table — instead of
     * the previous recursive per-row deletes.
     */
    private void deleteRecursive(Comment root, UUID postId) {
        List<Comment> allForPost = commentRepository.findByPost(postId);
        List<UUID> toDelete = new ArrayList<>();
        toDelete.add(root.id);
        collectDescendantIds(root.id, allForPost, toDelete);
        commentReactionRepository.deleteByCommentIds(toDelete);
        commentRepository.deleteByIds(toDelete);
    }

    private void collectDescendantIds(UUID parentId, List<Comment> all, List<UUID> acc) {
        for (Comment c : all) {
            if (c.parentComment != null && c.parentComment.id.equals(parentId)) {
                acc.add(c.id);
                collectDescendantIds(c.id, all, acc);
            }
        }
    }

    /**
     * Deletes all comments (and their reactions) for a post using batch queries —
     * previously issued one DELETE per comment reaction.
     */
    public void deleteAllByPost(UUID postId) {
        List<UUID> commentIds = commentRepository.findIdsByPost(postId);
        if (!commentIds.isEmpty()) {
            commentReactionRepository.deleteByCommentIds(commentIds);
        }
        commentRepository.delete("post.id", postId);
    }

    private CommentResDto toDto(Comment comment, String userReaction, long likes, long dislikes, List<CommentResDto> replies) {
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

    private void applyCommentReactionDelta(Comment comment, String reactionType, int delta) {
        if (!readModelWriteEnabled()) {
            return;
        }
        if ("like".equals(reactionType)) {
            comment.likeCount = Math.max(0L, comment.likeCount + delta);
        } else if ("dislike".equals(reactionType)) {
            comment.dislikeCount = Math.max(0L, comment.dislikeCount + delta);
        }
    }

    private void recalculatePostCommentCounters(UUID postId) {
        Post post = postRepository.findByIdOptional(postId).orElse(null);
        if (post == null) {
            return;
        }
        List<Comment> comments = commentRepository.findByPost(postId);
        post.commentCount = comments.size();
        Map<UUID, Long> replyCounts = comments.stream()
                .filter(comment -> comment.parentComment != null && comment.parentComment.id != null)
                .collect(Collectors.groupingBy(comment -> comment.parentComment.id, Collectors.counting()));
        comments.forEach(comment -> comment.replyCount = replyCounts.getOrDefault(comment.id, 0L));
    }

    private boolean readModelReadEnabled() {
        return flags != null && flags.readModelReadEnabled();
    }

    private boolean readModelWriteEnabled() {
        return flags != null && flags.readModelWriteEnabled();
    }
}
