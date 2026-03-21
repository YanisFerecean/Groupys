package com.groupys.dto;

import java.util.List;

public record SearchResDto(
        List<ArtistResDto> artists,
        List<AlbumResDto> albums,
        List<TrackResDto> tracks
) {
}
