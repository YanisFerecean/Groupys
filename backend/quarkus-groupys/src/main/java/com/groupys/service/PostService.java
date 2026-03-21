package com.groupys.service;

import com.groupys.dto.PostResDto;
import com.groupys.model.Community;
import com.groupys.model.Post;
import com.groupys.model.PostReaction;
import com.groupys.model.User;
import com.groupys.repository.*;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;

import java.util.List;
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

    public List<PostResDto> getFeed(String clerkId) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        List<UUID> communityIds = communityMemberRepository.findByUser(user.id).stream()
                .map(m -> m.community.id)
                .toList();
        return postRepository.findByCommunities(communityIds).stream()
                .map(post -> toDto(post, user))
                .toList();
    }

    public List<PostResDto> getByCommunity(UUID communityId, String clerkId) {
        User user = userRepository.findByClerkId(clerkId).orElse(null);
        return postRepository.findByCommunity(communityId).stream()
                .map(post -> toDto(post, user))
                .toList();
    }

    public PostResDto getById(UUID postId, String clerkId) {
        User user = userRepository.findByClerkId(clerkId).orElse(null);
        Post post = postRepository.findByIdOptional(postId)
                .orElseThrow(() -> new NotFoundException("Post not found"));
        return toDto(post, user);
    }

    @Transactional
    public PostResDto create(UUID communityId, String content, String mediaUrl, String mediaType, String clerkId) {
        User author = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        Community community = communityRepository.findByIdOptional(communityId)
                .orElseThrow(() -> new NotFoundException("Community not found"));

        Post post = new Post();
        post.content = content;
        post.mediaUrl = mediaUrl;
        post.mediaType = mediaType;
        post.community = community;
        post.author = author;
        postRepository.persist(post);

        return toDto(post, author);
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

        return toDto(post, user);
    }

    @Transactional
    public void delete(UUID postId, String clerkId) {
        Post post = postRepository.findByIdOptional(postId)
                .orElseThrow(() -> new NotFoundException("Post not found"));
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        if (!post.author.id.equals(user.id)) {
            throw new jakarta.ws.rs.ForbiddenException("Not the author");
        }
        commentService.deleteAllByPost(postId);
        postReactionRepository.delete("post.id", postId);
        postRepository.delete(post);
    }

    private PostResDto toDto(Post post, User currentUser) {
        long likes = postReactionRepository.countByPostAndType(post.id, "like");
        long dislikes = postReactionRepository.countByPostAndType(post.id, "dislike");
        long comments = commentRepository.countByPost(post.id);
        String userReaction = null;
        if (currentUser != null) {
            userReaction = postReactionRepository.findByPostAndUser(post.id, currentUser.id)
                    .map(r -> r.reactionType)
                    .orElse(null);
        }
        return new PostResDto(
                post.id,
                post.content,
                post.mediaUrl,
                post.mediaType,
                post.community.id,
                post.community.name,
                post.author.id,
                post.author.username,
                post.author.displayName,
                post.author.profileImage,
                post.createdAt,
                likes,
                dislikes,
                userReaction,
                comments
        );
    }
}
