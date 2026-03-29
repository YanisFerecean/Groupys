package com.groupys.service;

import com.groupys.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DiscoveryServiceTest {

    @Test
    void refreshAllActiveUsersDelegatesEachIdThroughProxy() {
        UUID firstUserId = UUID.nameUUIDFromBytes("discovery-user-1".getBytes());
        UUID secondUserId = UUID.nameUUIDFromBytes("discovery-user-2".getBytes());

        DiscoveryService service = new DiscoveryService();
        service.userRepository = new StubUserRepository(List.of(firstUserId, secondUserId));

        RecordingDiscoveryService proxy = new RecordingDiscoveryService();
        service.self = proxy;

        service.refreshAllActiveUsers();

        assertEquals(List.of(firstUserId, secondUserId), proxy.refreshedUserIds);
    }

    @Test
    void refreshAllActiveUsersStopsWhenShutdownStarts() {
        UUID userId = UUID.nameUUIDFromBytes("discovery-user-shutdown".getBytes());

        DiscoveryService service = new DiscoveryService();
        service.userRepository = new StubUserRepository(List.of(userId));
        service.self = new RecordingDiscoveryService();
        service.onShutdown(null);

        service.refreshAllActiveUsers();

        assertEquals(List.of(), ((RecordingDiscoveryService) service.self).refreshedUserIds);
    }

    private static final class StubUserRepository extends UserRepository {
        private final List<UUID> userIds;

        private StubUserRepository(List<UUID> userIds) {
            this.userIds = userIds;
        }

        @Override
        public List<UUID> listActiveDiscoveryUserIds() {
            return userIds;
        }
    }

    private static final class RecordingDiscoveryService extends DiscoveryService {
        private final List<UUID> refreshedUserIds = new ArrayList<>();

        @Override
        public void refreshForUser(UUID userId) {
            refreshedUserIds.add(userId);
        }
    }
}
