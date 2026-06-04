package com.groupys.dto.apple;

import java.util.List;

public record AppleCatalogAlbum(
        String id,
        String name,
        String artistName,
        String artistId,
        String artworkUrlTemplate,
        Integer artworkWidth,
        Integer artworkHeight,
        String releaseDate,
        String recordLabel,
        Integer trackCount,
        List<String> genreNames,
        List<AppleCatalogSong> tracks
) {
}
