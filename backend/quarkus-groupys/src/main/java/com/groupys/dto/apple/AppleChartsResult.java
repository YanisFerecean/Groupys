package com.groupys.dto.apple;

import java.util.List;

public record AppleChartsResult(
        List<AppleCatalogArtist> topArtists,
        List<AppleCatalogSong> topSongs,
        List<AppleCatalogAlbum> topAlbums
) {
}
