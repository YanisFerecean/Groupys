package com.groupys.dto;

public record TrackResDto(
        Long id,
        String title,
        String preview,
        Integer duration,
        Integer rank,
        ArtistResDto artist,
        AlbumResDto album
) {
}
