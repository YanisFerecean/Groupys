package com.groupys.dto;

public record AlbumRatingCreateDto(
        Long albumId,
        String appleMusicId,
        String albumTitle,
        String albumCoverUrl,
        String artistName,
        int score,
        String review
) {
}
