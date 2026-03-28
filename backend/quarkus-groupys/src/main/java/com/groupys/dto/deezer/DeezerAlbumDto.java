package com.groupys.dto.deezer;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DeezerAlbumDto(
        Long id,
        String title,
        @JsonProperty("cover_small") String coverSmall,
        @JsonProperty("cover_medium") String coverMedium,
        @JsonProperty("cover_big") String coverBig,
        @JsonProperty("cover_xl") String coverXl,
        @JsonProperty("nb_tracks") Integer nbTracks,
        @JsonProperty("release_date") String releaseDate,
        String label,
        Integer duration,
        Integer fans,
        DeezerArtistDto artist,
        GenresWrapper genres,
        TracksWrapper tracks
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record GenresWrapper(List<DeezerGenreDto> data) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TracksWrapper(List<AlbumTrackDto> data) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AlbumTrackDto(
            Long id,
            String title,
            Integer duration,
            String preview,
            @JsonProperty("track_position") Integer trackPosition
    ) {}
}
