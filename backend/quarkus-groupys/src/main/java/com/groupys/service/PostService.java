package com.groupys.service;

import com.groupys.config.PerformanceFeatureFlags;
import com.groupys.dto.PostResDto;
import com.groupys.model.Community;
import com.groupys.model.Post;
import com.groupys.model.PostMedia;
import com.groupys.model.PostReaction;
import com.groupys.model.User;
import com.groupys.repository.*;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class PostService {

    @Inject
    PostRepository postRepository;

    @Inject
    CommunityRepository communityRepository;

    @Inject
    UserRepository userRepository;

    @Inject
    PostReactionRepository postReactionRepository;

    @Inject
    CommentRepository commentRepository;

    @Inject
    CommunityMemberRepository communityMemberRepository;

    @Inject
    CommentService commentService;

    @Inject
    StorageService storageService;

    @Inject
    DiscoveryService discoveryService;

    @Inject
    PerformanceFeatureFlags flags;

    public List<PostResDto> getFeed(String clerkId, int page, int size) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        List<UUID> communityIds = communityMemberRepository.findByUserLimited(user.id, 200).stream()
                .map(m -> m.community.id)
                .toList();
        List<Post> posts = postRepository.findByCommunitiesPaged(communityIds, page, size);
        return toDtoList(posts, user);
    }

    public List<PostResDto> getByCommunity(UUID communityId, String clerkId, int page, int size) {
        User user = userRepository.findByClerkId(clerkId).orElse(null);
        List<Post> posts = postRepository.findByCommunityPaged(communityId, page, size);
        return toDtoList(posts, user);
    }

    public List<PostResDto> getAccountPosts(String clerkId, int page, int size) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        List<Post> posts = postRepository.findByAuthorPaged(user.id, page, size);
        return toDtoList(posts, user);
    }

    public List<PostResDto> getByAuthor(UUID authorId, String clerkId) {
        User currentUser = userRepository.findByClerkId(clerkId).orElse(null);
        return postRepository.findByAuthor(authorId).stream()
                .map(post -> toDto(post, currentUser))
                .toList();
    }

    public PostResDto getById(UUID postId, String clerkId) {
        User user = userRepository.findByClerkId(clerkId).orElse(null);
        Post post = postRepository.findByIdOptional(postId)
                .orElseThrow(() -> new NotFoundException("Post not found"));
        return toDtoList(List.of(post), user).get(0);
    }

    @Transactional
    public PostResDto create(UUID communityId, String title, String content, List<PostMedia> mediaList, String clerkId) {
        User author = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        Community community = communityRepository.findByIdOptional(communityId)
                .orElseThrow(() -> new NotFoundException("Community not found"));

        Post post = new Post();
        post.title = title;
        post.content = content;
        if (mediaList != null) {
            post.media = new java.util.ArrayList<>(mediaList);
        }
        post.community = community;
        post.author = author;
        post.likeCount = 0L;
        post.dislikeCount = 0L;
        post.commentCount = 0L;
        postRepository.persist(post);
        try {
            discoveryService.refreshAfterCommunityActivity(communityId);
        } catch (Exception e) {
            Log.warnf(e, "Discovery refresh failed after post in community %s; post was saved", communityId);
        }

        return toDtoList(List.of(post), author).get(0);
    }

    @Transactional
    public PostResDto react(UUID postId, String reactionType, String clerkId) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        Post post = postRepository.findByIdOptional(postId)
                .orElseThrow(() -> new NotFoundException("Post not found"));
        String normalizedReaction = reactionType == null ? "" : reactionType.trim().toLowerCase();
        if (!"like".equals(normalizedReaction) && !"dislike".equals(normalizedReaction)) {
            throw new jakarta.ws.rs.BadRequestException("Reaction type must be 'like' or 'dislike'");
        }

        var existing = postReactionRepository.findByPostAndUser(postId, user.id);

        if (existing.isPresent()) {
            PostReaction reaction = existing.get();
            String oldType = reaction.reactionType == null ? "" : reaction.reactionType.toLowerCase();
            if (oldType.equals(normalizedReaction)) {
                postReactionRepository.delete(reaction);
                applyPostReactionDelta(post, oldType, -1);
            } else {
                reaction.reactionType = normalizedReaction;
                applyPostReactionDelta(post, oldType, -1);
                applyPostReactionDelta(post, normalizedReaction, 1);
            }
        } else {
            PostReaction reaction = new PostReaction();
            reaction.post = post;
            reaction.user = user;
            reaction.reactionType = normalizedReaction;
            postReactionRepository.persist(reaction);
            applyPostReactionDelta(post, normalizedReaction, 1);
        }

        discoveryService.refreshAfterCommunityActivity(post.community.id);

        return toDtoList(List.of(post), user).get(0);
    }

    @Transactional
    public void delete(UUID postId, String clerkId) {
        Post post = postRepository.findByIdOptional(postId)
                .orElseThrow(() -> new NotFoundException("Post not found"));
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        boolean isAuthor = post.author.id.equals(user.id);
        boolean isCommunityOwner = post.community.createdBy != null
                && post.community.createdBy.id.equals(user.id);
        if (!isAuthor && !isCommunityOwner) {
            throw new jakarta.ws.rs.ForbiddenException("Not authorized to delete this post");
        }
        UUID communityId = post.community.id;
        commentService.deleteAllByPost(postId);
        postReactionRepository.delete("post.id", postId);
        if (post.media != null && !post.media.isEmpty()) {
            for (PostMedia pm : post.media) {
                storageService.delete(pm.url);
            }
        }
        postRepository.delete(post);
        discoveryService.refreshAfterCommunityActivity(communityId);
    }

    /**
     * Converts a list of posts to DTOs using 4 batch queries total regardless of list size,
     * eliminating the previous N×4 query pattern.
     */
    private List<PostResDto> toDtoList(List<Post> posts, User currentUser) {
        if (posts.isEmpty()) return List.of();

        List<UUID> postIds = posts.stream().map(p -> p.id).toList();
        Map<UUID, String> userReactionMap = currentUser != null
                ? postReactionRepository.findUserReactionsByPostIds(postIds, currentUser.id)
                : Map.of();

        Map<UUID, Long> likesMapTmp = Map.of();
        Map<UUID, Long> dislikesMapTmp = Map.of();
        Map<UUID, Long> commentMapTmp = Map.of();
        boolean readModelRead = readModelReadEnabled();
        if (!readModelRead) {
            likesMapTmp = postReactionRepository.countsByPostIdsAndType(postIds, "like");
            dislikesMapTmp = postReactionRepository.countsByPostIdsAndType(postIds, "dislike");
            commentMapTmp = commentRepository.countsByPostIds(postIds);
        }
        final Map<UUID, Long> likesMap = likesMapTmp;
        final Map<UUID, Long> dislikesMap = dislikesMapTmp;
        final Map<UUID, Long> commentMap = commentMapTmp;
        final boolean readModelEnabled = readModelRead;

        return posts.stream().map(post -> {
            List<PostResDto.PostMediaDto> mediaDtos = new ArrayList<>();
            if (post.media != null) {
                for (int i = 0; i < post.media.size(); i++) {
                    PostMedia m = post.media.get(i);
                    mediaDtos.add(new PostResDto.PostMediaDto(m.url, m.type, i));
                }
            }
            return new PostResDto(
                    post.id,
                    post.content,
                    mediaDtos,
                    post.community.id,
                    post.community.name,
                    post.author.id,
                    post.author.username,
                    post.author.displayName,
                    post.author.profileImage,
                    post.author.clerkId,
                    post.createdAt,
                    readModelEnabled ? Math.max(0L, post.likeCount) : likesMap.getOrDefault(post.id, 0L),
                    readModelEnabled ? Math.max(0L, post.dislikeCount) : dislikesMap.getOrDefault(post.id, 0L),
                    userReactionMap.get(post.id),
                    readModelEnabled ? Math.max(0L, post.commentCount) : commentMap.getOrDefault(post.id, 0L),
                    post.title
            );
        }).toList();
    }

    private PostResDto toDto(Post post, User currentUser) {
        return toDtoList(List.of(post), currentUser).get(0);
    }

    private void applyPostReactionDelta(Post post, String reactionType, int delta) {
        if (!readModelWriteEnabled()) {
            return;
        }
        if ("like".equals(reactionType)) {
            post.likeCount = Math.max(0L, post.likeCount + delta);
        } else if ("dislike".equals(reactionType)) {
            post.dislikeCount = Math.max(0L, post.dislikeCount + delta);
        }
    }

    private boolean readModelReadEnabled() {
        return flags != null && flags.readModelReadEnabled();
    }

    private boolean readModelWriteEnabled() {
        return flags != null && flags.readModelWriteEnabled();
    }
}
