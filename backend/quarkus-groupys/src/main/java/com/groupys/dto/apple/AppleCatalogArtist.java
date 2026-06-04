package com.groupys.dto.apple;

import java.util.List;

public record AppleCatalogArtist(
        String id,
        String name,
        List<String> genreNames,
        String artworkUrlTemplate,
        Integer artworkWidth,
        Integer artworkHeight,
        String editorialNotesShort,
        String editorialNotesStandard
) {
}
