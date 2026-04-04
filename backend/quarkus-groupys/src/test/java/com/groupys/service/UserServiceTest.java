package com.groupys.service;

import com.groupys.dto.UserResDto;
import com.groupys.model.User;
import com.groupys.repository.UserFollowRepository;
import com.groupys.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UserServiceTest {

    @Test
    void searchExcludesCurrentUserAndMatchesUsernameOrDisplayNameCaseInsensitively() {
        StubUserRepository userRepository = new StubUserRepository(
                user("me", "clerk-me", "alex", "Alex"),
                user("friend-1", "clerk-f1", "amywine", "Amy"),
                user("friend-2", "clerk-f2", "luna", "Amythest"),
                user("friend-3", "clerk-f3", "bruno", "Bruno")
        );

        UserService service = new UserService();
        service.userRepository = userRepository;
        service.userFollowRepository = new StubUserFollowRepository();

        List<UserResDto> results = service.search("clerk-me", " AmY ", 10);

        assertEquals(List.of("amywine", "luna"), results.stream().map(UserResDto::username).toList());
        assertEquals(10, userRepository.lastLimit);
        assertEquals("Amy", results.getFirst().displayName());
    }

    @Test
    void searchReturnsEmptyListForBlankQueryAndClampsLimit() {
        StubUserRepository userRepository = new StubUserRepository(
                user("me", "clerk-me", "alex", "Alex"),
                user("friend-1", "clerk-f1", "amy1", "Amy One"),
                user("friend-2", "clerk-f2", "amy2", "Amy Two"),
                user("friend-3", "clerk-f3", "amy3", "Amy Three"),
                user("friend-4", "clerk-f4", "amy4", "Amy Four"),
                user("friend-5", "clerk-f5", "amy5", "Amy Five"),
                user("friend-6", "clerk-f6", "amy6", "Amy Six"),
                user("friend-7", "clerk-f7", "amy7", "Amy Seven"),
                user("friend-8", "clerk-f8", "amy8", "Amy Eight"),
                user("friend-9", "clerk-f9", "amy9", "Amy Nine"),
                user("friend-10", "clerk-f10", "amy10", "Amy Ten"),
                user("friend-11", "clerk-f11", "amy11", "Amy Eleven"),
                user("friend-12", "clerk-f12", "amy12", "Amy Twelve"),
                user("friend-13", "clerk-f13", "amy13", "Amy Thirteen"),
                user("friend-14", "clerk-f14", "amy14", "Amy Fourteen"),
                user("friend-15", "clerk-f15", "amy15", "Amy Fifteen"),
                user("friend-16", "clerk-f16", "amy16", "Amy Sixteen"),
                user("friend-17", "clerk-f17", "amy17", "Amy Seventeen"),
                user("friend-18", "clerk-f18", "amy18", "Amy Eighteen"),
                user("friend-19", "clerk-f19", "amy19", "Amy Nineteen"),
                user("friend-20", "clerk-f20", "amy20", "Amy Twenty"),
                user("friend-21", "clerk-f21", "amy21", "Amy Twenty-One")
        );

        UserService service = new UserService();
        service.userRepository = userRepository;
        service.userFollowRepository = new StubUserFollowRepository();

        assertTrue(service.search("clerk-me", "   ", 5).isEmpty());

        List<UserResDto> capped = service.search("clerk-me", "amy", 99);

        assertEquals(20, userRepository.lastLimit);
        assertEquals(20, capped.size());
    }

    @Test
    void searchStillWorksWhenAuthenticatedUserHasNoLocalRowYet() {
        StubUserRepository userRepository = new StubUserRepository(
                user("friend-1", "clerk-f1", "amywine", "Amy"),
                user("friend-2", "clerk-f2", "luna", "Luna")
        );

        UserService service = new UserService();
        service.userRepository = userRepository;
        service.userFollowRepository = new StubUserFollowRepository();

        List<UserResDto> results = service.search("clerk-missing", "amy", 10);

        assertEquals(List.of("amywine"), results.stream().map(UserResDto::username).toList());
        assertEquals(10, userRepository.lastLimit);
    }

    private static User user(String idSeed, String clerkId, String username, String displayName) {
        User user = new User();
        user.id = UUID.nameUUIDFromBytes(idSeed.getBytes());
        user.clerkId = clerkId;
        user.username = username;
        user.displayName = displayName;
        user.dateJoined = Instant.parse("2025-01-01T00:00:00Z");
        return user;
    }

    private static final class StubUserRepository extends UserRepository {
        private final List<User> users = new ArrayList<>();
        private int lastLimit = -1;

        private StubUserRepository(User... initialUsers) {
            users.addAll(List.of(initialUsers));
        }

        @Override
        public Optional<User> findByClerkId(String clerkId) {
            return users.stream().filter(user -> clerkId.equals(user.clerkId)).findFirst();
        }

        @Override
        public List<User> searchByUsernameOrDisplayName(String query, UUID excludeUserId, int limit) {
            lastLimit = limit;
            String lowered = query.toLowerCase();
            return users.stream()
                    .filter(user -> excludeUserId == null || !user.id.equals(excludeUserId))
                    .filter(user -> user.username.toLowerCase().contains(lowered)
                            || (user.displayName != null && user.displayName.toLowerCase().contains(lowered)))
                    .sorted(Comparator.comparing(user -> user.username))
                    .limit(limit)
                    .toList();
        }
    }

    private static final class StubUserFollowRepository extends UserFollowRepository {
        @Override
        public long countFollowers(UUID userId) {
            return 0;
        }

        @Override
        public long countFollowing(UUID userId) {
            return 0;
        }
    }
}
