package com.groupys.dto;

public record AlbumRatingCreateDto(
        Long albumId,
        String albumTitle,
        String albumCoverUrl,
        String artistName,
        int score,
        @jakarta.validation.constraints.NotBlank String review
) {
}
