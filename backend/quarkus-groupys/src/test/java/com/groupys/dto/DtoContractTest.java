package com.groupys.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DtoContractTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Test
    void artistResponseContractPreservesFieldNamesAndNumericId() throws Exception {
        ArtistResDto dto = new ArtistResDto(101L, "Artist One", List.of("img-1"), null, null, null, null);

        JsonNode json = OBJECT_MAPPER.valueToTree(dto);

        assertEquals(Set.of("id", "name", "images", "listeners", "playcount", "summary", "genre"), fieldNames(json));
        assertTrue(json.path("id").isIntegralNumber());
        assertTrue(json.path("listeners").isNull());
        assertTrue(json.path("playcount").isNull());
        assertTrue(json.path("summary").isNull());
    }

    @Test
    void albumResponseContractPreservesFieldNamesNestedTracksAndNullableFans() {
        AlbumResDto dto = new AlbumResDto(
                202L,
                "Album One",
                "small",
                "medium",
                "big",
                "xl",
                "2024-01-01",
                "Label",
                380,
                2,
                null,
                List.of("Pop"),
                new ArtistResDto(101L, "Artist One", List.of(), null, null, null, null),
                List.of(new AlbumResDto.TrackDto(303L, "Track One", 180, "preview", 1))
        );

        JsonNode json = OBJECT_MAPPER.valueToTree(dto);

        assertEquals(
                Set.of("id", "title", "coverSmall", "coverMedium", "coverBig", "coverXl", "releaseDate",
                        "label", "duration", "nbTracks", "fans", "genres", "artist", "tracks"),
                fieldNames(json)
        );
        assertTrue(json.path("id").isIntegralNumber());
        assertTrue(json.path("fans").isNull());
        assertEquals(
                Set.of("id", "title", "duration", "preview", "trackPosition"),
                fieldNames(json.path("tracks").get(0))
        );
        assertTrue(json.path("tracks").get(0).path("id").isIntegralNumber());
    }

    @Test
    void trackResponseContractPreservesFieldNamesAndNullableRank() {
        TrackResDto dto = new TrackResDto(
                303L,
                "Track One",
                "preview",
                180,
                null,
                new ArtistResDto(101L, "Artist One", List.of(), null, null, null, null),
                new AlbumResDto(202L, "Album One", "small", "medium", "big", "xl", "2024-01-01", "Label", 380, 2, null, List.of("Pop"), null, List.of())
        );

        JsonNode json = OBJECT_MAPPER.valueToTree(dto);

        assertEquals(Set.of("id", "title", "preview", "duration", "rank", "artist", "album"), fieldNames(json));
        assertTrue(json.path("id").isIntegralNumber());
        assertTrue(json.path("rank").isNull());
    }

    @Test
    void chartAndMusicProfileContractsPreserveExistingFields() {
        TopTrackResDto topTrack = new TopTrackResDto(
                "Track One",
                new ArtistResDto(101L, "Artist One", List.of(), null, null, null, null),
                null,
                null
        );
        TopAlbumResDto topAlbum = new TopAlbumResDto(
                "Album One",
                new ArtistResDto(101L, "Artist One", List.of(), null, null, null, null)
        );
        MusicArtistResDto musicArtist = new MusicArtistResDto("Artist One", "image");
        MusicAlbumResDto musicAlbum = new MusicAlbumResDto("apple-album-1", "Album One", "Artist One", "cover");
        MusicTrackResDto musicTrack = new MusicTrackResDto("Track One", "Artist One", "cover");

        JsonNode topTrackJson = OBJECT_MAPPER.valueToTree(topTrack);
        JsonNode topAlbumJson = OBJECT_MAPPER.valueToTree(topAlbum);
        JsonNode musicArtistJson = OBJECT_MAPPER.valueToTree(musicArtist);
        JsonNode musicAlbumJson = OBJECT_MAPPER.valueToTree(musicAlbum);
        JsonNode musicTrackJson = OBJECT_MAPPER.valueToTree(musicTrack);

        assertEquals(Set.of("name", "artist", "listeners", "playcount"), fieldNames(topTrackJson));
        assertTrue(topTrackJson.path("listeners").isNull());
        assertTrue(topTrackJson.path("playcount").isNull());
        assertEquals(Set.of("name", "artist"), fieldNames(topAlbumJson));
        assertEquals(Set.of("name", "imageUrl"), fieldNames(musicArtistJson));
        assertEquals(Set.of("appleMusicId", "title", "artist", "coverUrl"), fieldNames(musicAlbumJson));
        assertEquals(Set.of("title", "artist", "coverUrl"), fieldNames(musicTrackJson));
    }

    private static Set<String> fieldNames(JsonNode node) {
        Set<String> names = new LinkedHashSet<>();
        Iterator<String> iterator = node.fieldNames();
        while (iterator.hasNext()) {
            names.add(iterator.next());
        }
        return names;
    }
}
