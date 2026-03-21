package com.groupys.service;

import com.groupys.dto.PostResDto;
import com.groupys.model.Community;
import com.groupys.model.Post;
import com.groupys.model.User;
import com.groupys.repository.CommunityRepository;
import com.groupys.repository.PostRepository;
import com.groupys.repository.UserRepository;
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

    public List<PostResDto> getByCommunity(UUID communityId) {
        return postRepository.findByCommunity(communityId).stream()
                .map(this::toDto)
                .toList();
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

        return toDto(post);
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
        postRepository.delete(post);
    }

    private PostResDto toDto(Post post) {
        return new PostResDto(
                post.id,
                post.content,
                post.mediaUrl,
                post.mediaType,
                post.community.id,
                post.author.id,
                post.author.username,
                post.author.displayName,
                post.author.profileImage,
                post.createdAt
        );
    }
}
