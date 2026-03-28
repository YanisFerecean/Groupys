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
        ArtistResDto artist,
        List<TrackDto> tracks
) {
    public record TrackDto(
            Long id,
            String title,
            Integer duration,
            String preview,
            Integer trackPosition
    ) {}
}
