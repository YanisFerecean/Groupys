package com.groupys.service;

import com.groupys.dto.PostResDto;
import com.groupys.model.Community;
import com.groupys.model.Post;
import com.groupys.model.PostMedia;
import com.groupys.model.PostReaction;
import com.groupys.model.User;
import com.groupys.repository.*;
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

    public List<PostResDto> getFeed(String clerkId, int page, int size) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        List<UUID> communityIds = communityMemberRepository.findByUser(user.id).stream()
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
        postRepository.persist(post);
        discoveryService.refreshAfterCommunityActivity(communityId);

        return toDtoList(List.of(post), author).get(0);
    }

    @Transactional
    public PostResDto react(UUID postId, String reactionType, String clerkId) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        Post post = postRepository.findByIdOptional(postId)
                .orElseThrow(() -> new NotFoundException("Post not found"));

        var existing = postReactionRepository.findByPostAndUser(postId, user.id);

        if (existing.isPresent()) {
            PostReaction reaction = existing.get();
            if (reaction.reactionType.equals(reactionType)) {
                postReactionRepository.delete(reaction);
            } else {
                reaction.reactionType = reactionType;
            }
        } else {
            PostReaction reaction = new PostReaction();
            reaction.post = post;
            reaction.user = user;
            reaction.reactionType = reactionType;
            postReactionRepository.persist(reaction);
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

        Map<UUID, Long> likesMap    = postReactionRepository.countsByPostIdsAndType(postIds, "like");
        Map<UUID, Long> dislikesMap = postReactionRepository.countsByPostIdsAndType(postIds, "dislike");
        Map<UUID, Long> commentMap  = commentRepository.countsByPostIds(postIds);
        Map<UUID, String> userReactionMap = currentUser != null
                ? postReactionRepository.findUserReactionsByPostIds(postIds, currentUser.id)
                : Map.of();

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
                    likesMap.getOrDefault(post.id, 0L),
                    dislikesMap.getOrDefault(post.id, 0L),
                    userReactionMap.get(post.id),
                    commentMap.getOrDefault(post.id, 0L),
                    post.title
            );
        }).toList();
    }
}
