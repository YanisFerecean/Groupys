package com.groupys.dto;

public record TopTrackResDto(
        String name,
        ArtistResDto artist,
        Long listeners,
        Long playcount
) {
}
