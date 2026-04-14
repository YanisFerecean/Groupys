package com.groupys.service;

import com.groupys.config.PerformanceFeatureFlags;
import com.groupys.dto.PostResDto;
import com.groupys.model.Community;
import com.groupys.model.CommunityMember;
import com.groupys.model.CommunityRecommendationCache;
import com.groupys.model.Post;
import com.groupys.model.User;
import com.groupys.repository.CommentRepository;
import com.groupys.repository.CommunityMemberRepository;
import com.groupys.repository.CommunityRecommendationCacheRepository;
import com.groupys.repository.FriendshipRepository;
import com.groupys.repository.PostReactionRepository;
import com.groupys.repository.PostRepository;
import com.groupys.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Tests for the feed recommendation logic in PostService.getFeed().
 * Covers reason code assignment, priority deduplication, and scoring order.
 */
class PostServiceFeedTest {

    // ── Tests ────────────────────────────────────────────────────────────────

    @Test
    void joinedCommunityPostsHaveNullReasonCode() {
        User user = user("user-1", "clerk-1", "alice");
        Community joined = community("comm-joined", "Joined Community");
        Post post = post("post-1", joined, user);

        PostService service = minimalService(user);
        service.communityMemberRepository = stubMemberships(user, joined);
        service.postRepository = stubPosts(List.of(post), List.of(), List.of());

        List<PostResDto> feed = service.getFeed(user.clerkId, 0, 20);

        assertEquals(1, feed.size());
        assertNull(feed.getFirst().feedReasonCode(), "Joined community posts must not have a reason code");
    }

    @Test
    void friendAuthoredPostsGetFriendPostedReasonCode() {
        User user = user("user-2", "clerk-2", "bob");
        User friend = user("friend-2", "clerk-f2", "charlie");
        Community other = community("comm-other-2", "Other Community");
        Post friendPost = post("post-friend-2", other, friend);

        PostService service = minimalService(user);
        service.friendshipRepository = stubFriendIds(friend.id);
        service.postRepository = stubPosts(List.of(), List.of(friendPost), List.of());

        List<PostResDto> feed = service.getFeed(user.clerkId, 0, 20);

        assertEquals(1, feed.size());
        assertEquals("FRIEND_POSTED", feed.getFirst().feedReasonCode());
    }

    @Test
    void friendLikedPostsGetFriendLikedReasonCode() {
        User user = user("user-3", "clerk-3", "diana");
        User friend = user("friend-3", "clerk-f3", "eve");
        User postAuthor = user("author-3", "clerk-a3", "frank");
        Community other = community("comm-other-3", "Other Community");
        Post likedPost = post("post-liked-3", other, postAuthor);

        PostService service = minimalService(user);
        service.friendshipRepository = stubFriendIds(friend.id);
        service.postRepository = stubPosts(List.of(), List.of(), List.<Object[]>of(new Object[]{likedPost, friend}));

        List<PostResDto> feed = service.getFeed(user.clerkId, 0, 20);

        assertEquals(1, feed.size());
        assertEquals("FRIEND_LIKED", feed.getFirst().feedReasonCode());
    }

    @Test
    void recommendedCommunityPostsGetRecommendedCommunityReasonCode() {
        User user = user("user-4", "clerk-4", "grace");
        Community rec = community("comm-rec-4", "Recommended Community");
        Post recPost = post("post-rec-4", rec, user("author-4", "clerk-a4", "henry"));

        PostService service = minimalService(user);
        service.communityRecommendationCacheRepository = stubRecCaches(user, rec, 0.80);
        service.postRepository = stubPosts(List.of(recPost), List.of(), List.of());

        List<PostResDto> feed = service.getFeed(user.clerkId, 0, 20);

        assertEquals(1, feed.size());
        assertEquals("RECOMMENDED_COMMUNITY", feed.getFirst().feedReasonCode());
    }

    @Test
    void friendPostedWinsOverFriendLikedForSamePost() {
        User user = user("user-5", "clerk-5", "iris");
        User friend = user("friend-5", "clerk-f5", "jake");
        Community other = community("comm-other-5", "Other Community");
        Post sharedPost = post("post-shared-5", other, friend);

        // Same post appears in both FRIEND_POSTED and FRIEND_LIKED buckets
        PostService service = minimalService(user);
        service.friendshipRepository = stubFriendIds(friend.id);
        service.postRepository = stubPosts(
                List.of(),
                List.of(sharedPost),
                List.<Object[]>of(new Object[]{sharedPost, friend})
        );

        List<PostResDto> feed = service.getFeed(user.clerkId, 0, 20);

        assertEquals(1, feed.size(), "Duplicate must be deduplicated to a single entry");
        assertEquals("FRIEND_POSTED", feed.getFirst().feedReasonCode(),
                "FRIEND_POSTED must take priority over FRIEND_LIKED");
    }

    @Test
    void friendPostedWinsOverRecommendedCommunityForSamePost() {
        User user = user("user-6", "clerk-6", "kim");
        User friend = user("friend-6", "clerk-f6", "leo");
        Community rec = community("comm-rec-6", "Recommended Community");
        Post sharedPost = post("post-shared-6", rec, friend);

        // Post from a recommended community, also authored by a friend
        PostService service = minimalService(user);
        service.friendshipRepository = stubFriendIds(friend.id);
        service.communityRecommendationCacheRepository = stubRecCaches(user, rec, 0.80);
        service.postRepository = stubPosts(
                List.of(sharedPost),
                List.of(sharedPost),
                List.of()
        );

        List<PostResDto> feed = service.getFeed(user.clerkId, 0, 20);

        assertEquals(1, feed.size(), "Duplicate must be deduplicated");
        assertEquals("FRIEND_POSTED", feed.getFirst().feedReasonCode(),
                "FRIEND_POSTED must take priority over RECOMMENDED_COMMUNITY");
    }

    @Test
    void friendLikedWinsOverRecommendedCommunityForSamePost() {
        User user = user("user-7", "clerk-7", "mia");
        User friend = user("friend-7", "clerk-f7", "noah");
        User postAuthor = user("author-7", "clerk-a7", "olivia");
        Community rec = community("comm-rec-7", "Recommended Community");
        Post sharedPost = post("post-shared-7", rec, postAuthor);

        // Post from a recommended community, also liked by a friend
        PostService service = minimalService(user);
        service.friendshipRepository = stubFriendIds(friend.id);
        service.communityRecommendationCacheRepository = stubRecCaches(user, rec, 0.80);
        service.postRepository = stubPosts(
                List.of(sharedPost),
                List.of(),
                List.<Object[]>of(new Object[]{sharedPost, friend})
        );

        List<PostResDto> feed = service.getFeed(user.clerkId, 0, 20);

        assertEquals(1, feed.size(), "Duplicate must be deduplicated");
        assertEquals("FRIEND_LIKED", feed.getFirst().feedReasonCode(),
                "FRIEND_LIKED must take priority over RECOMMENDED_COMMUNITY");
    }

    @Test
    void friendAuthoredPostsRankedAboveFriendLikedAtSameRecency() {
        User user = user("user-8", "clerk-8", "paul");
        User friend = user("friend-8", "clerk-f8", "quinn");
        User postAuthor = user("author-8", "clerk-a8", "rose");
        Community other = community("comm-other-8", "Other Community");

        // Both posts created at the same time — recency is equal so scoring weight decides order
        Instant now = Instant.now();
        Post friendAuthored = post("post-authored-8", other, friend, now);
        Post friendLiked = post("post-liked-8", other, postAuthor, now);

        PostService service = minimalService(user);
        service.friendshipRepository = stubFriendIds(friend.id);
        service.postRepository = stubPosts(
                List.of(),
                List.of(friendAuthored),
                List.<Object[]>of(new Object[]{friendLiked, friend})
        );

        List<PostResDto> feed = service.getFeed(user.clerkId, 0, 20);

        assertEquals(2, feed.size());
        assertEquals(friendAuthored.id, feed.get(0).id(),
                "Friend-authored post (weight 0.80) must rank before friend-liked post (weight 0.60)");
        assertEquals("FRIEND_POSTED", feed.get(0).feedReasonCode());
        assertEquals("FRIEND_LIKED", feed.get(1).feedReasonCode());
    }

    @Test
    void noFriendsAndNoRecommendationsReturnsOnlyJoinedPosts() {
        User user = user("user-9", "clerk-9", "sam");
        Community joined = community("comm-joined-9", "My Community");
        Post joinedPost = post("post-joined-9", joined, user);

        PostService service = minimalService(user);
        service.communityMemberRepository = stubMemberships(user, joined);
        service.postRepository = stubPosts(List.of(joinedPost), List.of(), List.of());

        List<PostResDto> feed = service.getFeed(user.clerkId, 0, 20);

        assertEquals(1, feed.size());
        assertNull(feed.getFirst().feedReasonCode());
    }

    @Test
    void emptyFeedWhenUserHasNoDataAtAll() {
        User user = user("user-10", "clerk-10", "tina");

        PostService service = minimalService(user);
        service.postRepository = stubPosts(List.of(), List.of(), List.of());

        List<PostResDto> feed = service.getFeed(user.clerkId, 0, 20);

        assertTrue(feed.isEmpty(), "Feed must be empty when user has no communities, friends, or recommendations");
    }

    @Test
    void belowThresholdRecommendedCommunityPostsAreExcluded() {
        User user = user("user-11", "clerk-11", "uma");
        Community lowScoreRec = community("comm-low-11", "Low Score Community");
        Post recPost = post("post-rec-11", lowScoreRec, user("author-11", "clerk-a11", "victor"));

        PostService service = minimalService(user);
        // Score 0.20 is below the 0.35 threshold in PostService.getFeed()
        service.communityRecommendationCacheRepository = stubRecCaches(user, lowScoreRec, 0.20);
        service.postRepository = stubPosts(List.of(recPost), List.of(), List.of());

        List<PostResDto> feed = service.getFeed(user.clerkId, 0, 20);

        assertTrue(feed.isEmpty(),
                "Posts from recommended communities scoring below 0.35 must not appear in feed");
    }

    @Test
    void paginationReturnsCorrectPageSlice() {
        User user = user("user-12", "clerk-12", "wendy");
        Community joined = community("comm-joined-12", "Page Community");

        // Create 5 posts with different timestamps so scoring is consistent
        List<Post> posts = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            posts.add(post("post-page-12-" + i, joined, user, Instant.now().minusSeconds((long) i * 60)));
        }

        PostService service = minimalService(user);
        service.communityMemberRepository = stubMemberships(user, joined);
        service.postRepository = stubPosts(posts, List.of(), List.of());

        List<PostResDto> page0 = service.getFeed(user.clerkId, 0, 3);
        List<PostResDto> page1 = service.getFeed(user.clerkId, 1, 3);

        assertEquals(3, page0.size(), "Page 0 must return 3 posts");
        assertEquals(2, page1.size(), "Page 1 must return remaining 2 posts");

        // Pages must not overlap
        Set<UUID> page0Ids = Set.of(page0.get(0).id(), page0.get(1).id(), page0.get(2).id());
        for (PostResDto dto : page1) {
            assertTrue(!page0Ids.contains(dto.id()), "Page 1 must not repeat posts from page 0");
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static User user(String seed, String clerkId, String username) {
        User user = new User();
        user.id = UUID.nameUUIDFromBytes(seed.getBytes(StandardCharsets.UTF_8));
        user.clerkId = clerkId;
        user.username = username;
        user.displayName = username;
        user.profileImage = null;
        return user;
    }

    private static Community community(String seed, String name) {
        Community community = new Community();
        community.id = UUID.nameUUIDFromBytes(seed.getBytes(StandardCharsets.UTF_8));
        community.name = name;
        return community;
    }

    private static Post post(String seed, Community community, User author) {
        return post(seed, community, author, Instant.now());
    }

    private static Post post(String seed, Community community, User author, Instant createdAt) {
        Post post = new Post();
        post.id = UUID.nameUUIDFromBytes(seed.getBytes(StandardCharsets.UTF_8));
        post.community = community;
        post.author = author;
        post.content = "Content of " + seed;
        post.title = null;
        post.media = List.of();
        post.likeCount = 0L;
        post.dislikeCount = 0L;
        post.commentCount = 0L;
        post.createdAt = createdAt;
        return post;
    }

    private static CommunityMember membership(User user, Community community) {
        CommunityMember member = new CommunityMember();
        member.id = UUID.nameUUIDFromBytes(("member-" + user.id + "-" + community.id).getBytes(StandardCharsets.UTF_8));
        member.user = user;
        member.community = community;
        member.joinedAt = Instant.now();
        return member;
    }

    private static CommunityRecommendationCache recCache(User user, Community community, double score) {
        CommunityRecommendationCache cache = new CommunityRecommendationCache();
        cache.id = UUID.nameUUIDFromBytes(("cache-" + user.id + "-" + community.id).getBytes(StandardCharsets.UTF_8));
        cache.user = user;
        cache.community = community;
        cache.score = score;
        cache.computedAt = Instant.now();
        cache.expiresAt = Instant.now().plusSeconds(3600);
        return cache;
    }

    /**
     * Builds a PostService wired with minimal stubs that are safe for getFeed().
     * Unused fields (discoveryService, commentService, storageService, communityRepository)
     * are left null because getFeed() never accesses them.
     */
    private static PostService minimalService(User user) {
        PostService service = new PostService();
        service.userRepository = new StubUserRepository(user);
        service.communityMemberRepository = new StubCommunityMemberRepository(List.of());
        service.communityRecommendationCacheRepository = new StubCommunityRecommendationCacheRepository(List.of());
        service.friendshipRepository = new StubFriendshipRepository(Set.of());
        service.postRepository = stubPosts(List.of(), List.of(), List.of());
        service.postReactionRepository = new StubPostReactionRepository();
        service.commentRepository = new StubCommentRepository();
        service.flags = new NoOpFlags();
        return service;
    }

    // Convenience wiring helpers

    private static CommunityMemberRepository stubMemberships(User user, Community... communities) {
        List<CommunityMember> memberships = new ArrayList<>();
        for (Community c : communities) {
            memberships.add(membership(user, c));
        }
        return new StubCommunityMemberRepository(memberships);
    }

    private static FriendshipRepository stubFriendIds(UUID... friendIds) {
        return new StubFriendshipRepository(Set.of(friendIds));
    }

    private static CommunityRecommendationCacheRepository stubRecCaches(User user, Community community, double score) {
        return new StubCommunityRecommendationCacheRepository(List.of(recCache(user, community, score)));
    }

    /**
     * @param joinedAndRecPosts posts that appear via findByCommunitiesRecentLimited (filtered by community ID)
     * @param friendAuthoredPosts posts returned by findByAuthorsInNonJoinedCommunities
     * @param friendLikedRows Object[]{Post, User} pairs for findLikedByFriendsInNonJoinedCommunities
     */
    private static PostRepository stubPosts(
            List<Post> joinedAndRecPosts,
            List<Post> friendAuthoredPosts,
            List<Object[]> friendLikedRows) {
        return new StubPostRepository(joinedAndRecPosts, friendAuthoredPosts, friendLikedRows);
    }

    // ── Stubs ────────────────────────────────────────────────────────────────

    private static final class StubUserRepository extends UserRepository {
        private final User user;

        StubUserRepository(User user) { this.user = user; }

        @Override
        public Optional<User> findByClerkId(String clerkId) {
            return Optional.ofNullable(clerkId.equals(user.clerkId) ? user : null);
        }
    }

    private static final class StubCommunityMemberRepository extends CommunityMemberRepository {
        private final List<CommunityMember> memberships;

        StubCommunityMemberRepository(List<CommunityMember> memberships) {
            this.memberships = memberships;
        }

        @Override
        public List<CommunityMember> findByUserLimited(UUID userId, int limit) {
            return memberships.stream()
                    .filter(m -> m.user.id.equals(userId))
                    .limit(limit)
                    .toList();
        }
    }

    private static final class StubCommunityRecommendationCacheRepository
            extends CommunityRecommendationCacheRepository {
        private final List<CommunityRecommendationCache> caches;

        StubCommunityRecommendationCacheRepository(List<CommunityRecommendationCache> caches) {
            this.caches = caches;
        }

        @Override
        public List<CommunityRecommendationCache> findFreshByUser(UUID userId, int limit) {
            return caches.stream()
                    .filter(c -> c.user.id.equals(userId))
                    .limit(limit)
                    .toList();
        }
    }

    private static final class StubFriendshipRepository extends FriendshipRepository {
        private final Set<UUID> friendIds;

        StubFriendshipRepository(Set<UUID> friendIds) { this.friendIds = friendIds; }

        @Override
        public Set<UUID> findAcceptedFriendIds(UUID userId) { return friendIds; }
    }

    private static final class StubPostRepository extends PostRepository {
        /** All posts for joined + recommended communities; filtered by community IDs at call time. */
        private final List<Post> communityPosts;
        /** Posts authored by friends in non-joined communities. */
        private final List<Post> friendAuthoredPosts;
        /** Object[]{Post, User} pairs for friend-liked posts. */
        private final List<Object[]> friendLikedRows;

        StubPostRepository(
                List<Post> communityPosts,
                List<Post> friendAuthoredPosts,
                List<Object[]> friendLikedRows) {
            this.communityPosts = communityPosts;
            this.friendAuthoredPosts = friendAuthoredPosts;
            this.friendLikedRows = friendLikedRows;
        }

        @Override
        public List<Post> findByCommunitiesRecentLimited(List<UUID> communityIds, int limit) {
            return communityPosts.stream()
                    .filter(p -> communityIds.contains(p.community.id))
                    .limit(limit)
                    .toList();
        }

        @Override
        public List<Post> findByAuthorsInNonJoinedCommunities(
                Set<UUID> authorIds, Set<UUID> excludedCommunityIds, int limit) {
            return friendAuthoredPosts.stream()
                    .filter(p -> authorIds.contains(p.author.id)
                            && !excludedCommunityIds.contains(p.community.id))
                    .limit(limit)
                    .toList();
        }

        @Override
        public List<Object[]> findLikedByFriendsInNonJoinedCommunities(
                Set<UUID> friendIds, Set<UUID> excludedCommunityIds, int limit) {
            return friendLikedRows.stream()
                    .filter(row -> !excludedCommunityIds.contains(((Post) row[0]).community.id))
                    .limit(limit)
                    .toList();
        }
    }

    private static final class StubPostReactionRepository extends PostReactionRepository {
        @Override
        public Map<UUID, String> findUserReactionsByPostIds(List<UUID> postIds, UUID userId) {
            return Map.of();
        }

        @Override
        public Map<UUID, Long> countsByPostIdsAndType(List<UUID> postIds, String type) {
            Map<UUID, Long> result = new HashMap<>();
            for (UUID id : postIds) result.put(id, 0L);
            return result;
        }
    }

    private static final class StubCommentRepository extends CommentRepository {
        @Override
        public Map<UUID, Long> countsByPostIds(List<UUID> postIds) {
            Map<UUID, Long> result = new HashMap<>();
            for (UUID id : postIds) result.put(id, 0L);
            return result;
        }
    }

    /** Flags with all features disabled — ensures toDtoList uses the legacy count queries. */
    private static final class NoOpFlags extends PerformanceFeatureFlags {
        @Override public boolean readModelReadEnabled() { return false; }
        @Override public boolean readModelWriteEnabled() { return false; }
    }
}
