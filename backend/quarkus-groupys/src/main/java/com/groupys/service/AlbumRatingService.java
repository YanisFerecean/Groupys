package com.groupys.service;

import com.groupys.dto.AlbumRatingCreateDto;
import com.groupys.dto.AlbumRatingResDto;
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

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class AlbumRatingService {

    @Inject
    AlbumRatingRepository albumRatingRepository;

    @Inject
    UserRepository userRepository;

    @Inject
    AlbumService albumService;

    @Transactional
    public AlbumRatingResDto upsert(AlbumRatingCreateDto dto, String clerkId) {
        if (dto.score() < 1 || dto.score() > 10) {
            throw new BadRequestException("Score must be between 1 and 10");
        }

        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (albumService.getById(dto.albumId()) == null) {
            throw new NotFoundException("Album not found");
        }

        AlbumRating rating = albumRatingRepository
                .findByUserAndAlbum(user.id, dto.albumId())
                .orElse(null);

        if (rating == null) {
            rating = new AlbumRating();
            rating.user = user;
            rating.albumId = dto.albumId();
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
