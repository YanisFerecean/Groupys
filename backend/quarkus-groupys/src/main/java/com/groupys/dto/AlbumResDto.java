package com.groupys.dto;

public record AlbumResDto(
        Long id,
        String title,
        String coverSmall,
        String coverMedium,
        String coverBig,
        String coverXl,
        ArtistResDto artist
) {
}
