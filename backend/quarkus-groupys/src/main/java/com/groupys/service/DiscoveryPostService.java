package com.groupys.service;

import com.groupys.config.PerformanceFeatureFlags;
import com.groupys.dto.DiscoveredPostResDto;
import com.groupys.dto.PostResDto;
import com.groupys.dto.UserSnippetDto;
import com.groupys.model.Post;
import com.groupys.model.PostMedia;
import com.groupys.model.User;
import com.groupys.repository.*;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.NotFoundException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class DiscoveryPostService {

    @Inject
    UserRepository userRepository;

    @Inject
    FriendshipRepository friendshipRepository;

    @Inject
    CommunityMemberRepository communityMemberRepository;

    @Inject
    CommunityRecommendationCacheRepository communityRecommendationCacheRepository;

    @Inject
    PostRepository postRepository;

    @Inject
    PostReactionRepository postReactionRepository;

    @Inject
    CommentRepository commentRepository;

    @Inject
    PerformanceFeatureFlags flags;

    private record PostEntry(Post post, String reasonCode, UserSnippetDto triggerFriend) {}

    public List<DiscoveredPostResDto> getSuggestedPosts(String clerkId, int limit) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        Set<UUID> friendIds = friendshipRepository.findAcceptedFriendIds(user.id);

        Set<UUID> joinedCommunityIds = communityMemberRepository.findByUserLimited(user.id, 200).stream()
                .map(m -> m.community.id)
                .collect(Collectors.toSet());

        List<UUID> recCommunityIds = communityRecommendationCacheRepository
                .findFreshByUser(user.id, 20).stream()
                .filter(c -> !joinedCommunityIds.contains(c.community.id) && c.score >= 0.35)
                .map(c -> c.community.id)
                .toList();

        // Three buckets — fetch 2× limit each for dedup headroom
        List<Post> friendPosts = postRepository.findByAuthorsInNonJoinedCommunities(
                friendIds, joinedCommunityIds, limit * 2);

        List<Object[]> likedRows = postRepository.findLikedByFriendsInNonJoinedCommunities(
                friendIds, joinedCommunityIds, limit * 2);

        List<Post> popularPosts = postRepository.findPopularInCommunities(recCommunityIds, limit * 2);

        // Deduplicate into LinkedHashMap: priority FRIEND_POSTED > FRIEND_LIKED > POPULAR_IN_COMMUNITY
        LinkedHashMap<UUID, PostEntry> entries = new LinkedHashMap<>();

        for (Post p : friendPosts) {
            entries.putIfAbsent(p.id, new PostEntry(p, "FRIEND_POSTED",
                    new UserSnippetDto(p.author.id, p.author.username, p.author.displayName, p.author.profileImage)));
        }

        for (Object[] row : likedRows) {
            Post p = (Post) row[0];
            User liker = (User) row[1];
            entries.putIfAbsent(p.id, new PostEntry(p, "FRIEND_LIKED",
                    new UserSnippetDto(liker.id, liker.username, liker.displayName, liker.profileImage)));
        }

        for (Post p : popularPosts) {
            entries.putIfAbsent(p.id, new PostEntry(p, "POPULAR_IN_COMMUNITY", null));
        }

        List<PostEntry> deduplicated = entries.values().stream().limit(limit).toList();
        if (deduplicated.isEmpty()) return List.of();

        // Batch-convert posts to DTOs (replicates PostService.toDtoList pattern)
        List<Post> posts = deduplicated.stream().map(e -> e.post).toList();
        List<UUID> postIds = posts.stream().map(p -> p.id).toList();

        Map<UUID, String> userReactionMap = postReactionRepository.findUserReactionsByPostIds(postIds, user.id);

        boolean readModelEnabled = flags != null && flags.readModelReadEnabled();
        Map<UUID, Long> likesMap = readModelEnabled ? Map.of()
                : postReactionRepository.countsByPostIdsAndType(postIds, "like");
        Map<UUID, Long> dislikesMap = readModelEnabled ? Map.of()
                : postReactionRepository.countsByPostIdsAndType(postIds, "dislike");
        Map<UUID, Long> commentMap = readModelEnabled ? Map.of()
                : commentRepository.countsByPostIds(postIds);

        List<DiscoveredPostResDto> result = new ArrayList<>(deduplicated.size());
        for (PostEntry entry : deduplicated) {
            Post p = entry.post;
            List<PostResDto.PostMediaDto> mediaDtos = new ArrayList<>();
            if (p.media != null) {
                for (int i = 0; i < p.media.size(); i++) {
                    PostMedia m = p.media.get(i);
                    mediaDtos.add(new PostResDto.PostMediaDto(m.url, m.type, i));
                }
            }
            PostResDto postDto = new PostResDto(
                    p.id,
                    p.content,
                    mediaDtos,
                    p.community.id,
                    p.community.name,
                    p.author.id,
                    p.author.username,
                    p.author.displayName,
                    p.author.profileImage,
                    p.author.clerkId,
                    p.createdAt,
                    readModelEnabled ? Math.max(0L, p.likeCount) : likesMap.getOrDefault(p.id, 0L),
                    readModelEnabled ? Math.max(0L, p.dislikeCount) : dislikesMap.getOrDefault(p.id, 0L),
                    userReactionMap.get(p.id),
                    readModelEnabled ? Math.max(0L, p.commentCount) : commentMap.getOrDefault(p.id, 0L),
                    p.title,
                    null,
                    null,
                    null
            );
            result.add(new DiscoveredPostResDto(postDto, entry.reasonCode, entry.triggerFriend));
        }
        return result;
    }
}
