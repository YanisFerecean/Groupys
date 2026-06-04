package com.groupys.service;

import com.groupys.dto.AlbumRatingCreateDto;
import com.groupys.dto.AlbumRatingResDto;
import com.groupys.model.Album;
import com.groupys.model.AlbumRating;
import com.groupys.model.User;
import com.groupys.repository.AlbumRatingRepository;
import com.groupys.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;
import org.jboss.logging.Logger;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class AlbumRatingService {

    private static final Logger LOG = Logger.getLogger(AlbumRatingService.class);

    @Inject
    AlbumRatingRepository albumRatingRepository;

    @Inject
    UserRepository userRepository;

    @Inject
    AlbumService albumService;

    @Inject
    AppleCatalogEntityService appleCatalogEntityService;

    @Transactional
    public AlbumRatingResDto upsert(AlbumRatingCreateDto dto, String clerkId) {
        if (dto.score() < 1 || dto.score() > 10) {
            throw new BadRequestException("Score must be between 1 and 10");
        }

        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        Long resolvedAlbumId = resolveAlbumId(dto);
        if (resolvedAlbumId == null) {
            LOG.warnf("Album rating upsert: could not resolve album. albumId=%s appleMusicId=%s title=%s",
                    dto.albumId(), dto.appleMusicId(), dto.albumTitle());
            throw new NotFoundException("Album not found (albumId=" + dto.albumId()
                    + ", appleMusicId=" + dto.appleMusicId() + ")");
        }

        AlbumRating rating = albumRatingRepository
                .findByUserAndAlbum(user.id, resolvedAlbumId)
                .orElse(null);

        if (rating == null) {
            rating = new AlbumRating();
            rating.user = user;
            rating.albumId = resolvedAlbumId;
            rating.createdAt = Instant.now();
        }

        rating.albumTitle = dto.albumTitle();
        rating.albumCoverUrl = dto.albumCoverUrl();
        rating.artistName = dto.artistName();
        rating.score = dto.score();
        rating.review = dto.review();
        rating.updatedAt = Instant.now();

        albumRatingRepository.persist(rating);
        return toDto(rating);
    }

    public List<AlbumRatingResDto> getByAlbumId(Long albumId) {
        return albumRatingRepository.findByAlbumId(albumId).stream()
                .map(this::toDto)
                .toList();
    }

    public List<AlbumRatingResDto> getByAppleMusicId(String appleMusicId) {
        if (appleMusicId == null || appleMusicId.isBlank()) {
            return List.of();
        }
        Album entity = appleCatalogEntityService.upsertAlbumReference(
                appleMusicId, null, null, null, null, null);
        if (entity == null) {
            return List.of();
        }
        return getByAlbumId(entity.getId());
    }

    public List<AlbumRatingResDto> getMyRatings(String clerkId) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        return albumRatingRepository.findByUserId(user.id).stream()
                .map(this::toDto)
                .toList();
    }

    public List<AlbumRatingResDto> getByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("User not found"));
        return albumRatingRepository.findByUserId(user.id).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public void delete(UUID ratingId, String clerkId) {
        AlbumRating rating = albumRatingRepository.findByIdOptional(ratingId)
                .orElseThrow(() -> new NotFoundException("Rating not found"));
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        if (!rating.user.id.equals(user.id)) {
            throw new ForbiddenException("Not authorized to delete this rating");
        }
        albumRatingRepository.delete(rating);
    }

    private Long resolveAlbumId(AlbumRatingCreateDto dto) {
        if (dto.albumId() != null && albumService.getById(dto.albumId()) != null) {
            return dto.albumId();
        }
        boolean hasApple = dto.appleMusicId() != null && !dto.appleMusicId().isBlank();
        boolean hasTitle = dto.albumTitle() != null && !dto.albumTitle().isBlank();
        if (hasApple || hasTitle) {
            Album entity = appleCatalogEntityService.upsertAlbumReference(
                    hasApple ? dto.appleMusicId() : null,
                    dto.albumTitle(),
                    null,
                    null,
                    null,
                    null
            );
            if (entity != null) {
                return entity.getId();
            }
        }
        return null;
    }

    private AlbumRatingResDto toDto(AlbumRating r) {
        return new AlbumRatingResDto(
                r.id,
                r.albumId,
                r.albumTitle,
                r.albumCoverUrl,
                r.artistName,
                r.user.id,
                r.user.username,
                r.user.displayName,
                r.user.profileImage,
                r.score,
                r.review,
                r.createdAt,
                r.updatedAt
        );
    }
}
