package com.groupys.dto.apple;

import java.util.List;

public record AppleCatalogSong(
        String id,
        String name,
        String artistName,
        String artistId,
        String albumName,
        String albumId,
        String previewUrl,
        Integer durationInMillis,
        String artworkUrlTemplate,
        Integer artworkWidth,
        Integer artworkHeight,
        List<String> genreNames,
        Integer trackNumber,
        String isrc
) {
}
