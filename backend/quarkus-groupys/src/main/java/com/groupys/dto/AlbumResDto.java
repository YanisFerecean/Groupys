package com.groupys.dto;

import java.util.List;

public record AlbumResDto(
        Long id,
        String title,
        String coverSmall,
        String coverMedium,
        String coverBig,
        String coverXl,
        String releaseDate,
        String label,
        Integer duration,
        Integer nbTracks,
        Integer fans,
        List<String> genres,
        ArtistResDto artist
) {
}
