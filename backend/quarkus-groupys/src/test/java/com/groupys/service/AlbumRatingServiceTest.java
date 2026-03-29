package com.groupys.service;

import com.groupys.dto.AlbumResDto;
import com.groupys.dto.AlbumRatingCreateDto;
import com.groupys.model.AlbumRating;
import com.groupys.model.User;
import com.groupys.repository.AlbumRatingRepository;
import com.groupys.repository.UserRepository;
import jakarta.ws.rs.NotFoundException;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AlbumRatingServiceTest {

    @Test
    void upsertRejectsMissingAlbum() {
        User user = new User();
        user.id = UUID.nameUUIDFromBytes("album-rating-user".getBytes());
        user.clerkId = "clerk-user";
        user.username = "listener";

        StubAlbumRatingRepository repository = new StubAlbumRatingRepository();

        AlbumRatingService service = new AlbumRatingService();
        service.userRepository = new StubUserRepository(user);
        service.albumService = new StubAlbumService();
        service.albumRatingRepository = repository;

        AlbumRatingCreateDto dto = new AlbumRatingCreateDto(
                302127L,
                "Album Title",
                "https://example.com/cover.jpg",
                "Artist Name",
                8,
                "Great record"
        );

        assertThrows(NotFoundException.class, () -> service.upsert(dto, user.clerkId));
        assertFalse(repository.persistCalled);
    }

    private static final class StubAlbumService extends AlbumService {
        @Override
        public AlbumResDto getById(Long id) {
            return null;
        }
    }

    private static final class StubAlbumRatingRepository extends AlbumRatingRepository {
        private boolean persistCalled;

        @Override
        public Optional<AlbumRating> findByUserAndAlbum(UUID userId, Long albumId) {
            return Optional.empty();
        }

        @Override
        public void persist(AlbumRating entity) {
            persistCalled = true;
        }
    }

    private static final class StubUserRepository extends UserRepository {
        private final User user;

        private StubUserRepository(User user) {
            this.user = user;
        }

        @Override
        public Optional<User> findByClerkId(String clerkId) {
            if (user.clerkId.equals(clerkId)) {
                return Optional.of(user);
            }
            return Optional.empty();
        }
    }
}
