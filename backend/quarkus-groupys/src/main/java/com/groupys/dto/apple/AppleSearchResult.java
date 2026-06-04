package com.groupys.dto.apple;

import java.util.List;

public record AppleSearchResult(
        List<AppleCatalogArtist> artists,
        List<AppleCatalogAlbum> albums,
        List<AppleCatalogSong> songs
) {
}
