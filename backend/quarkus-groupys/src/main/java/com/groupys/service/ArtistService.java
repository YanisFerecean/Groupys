package com.groupys.service;

import com.groupys.dto.ArtistResDto;
import com.groupys.dto.TrackResDto;
import com.groupys.dto.apple.AppleCatalogArtist;
import com.groupys.dto.apple.AppleCatalogSong;
import com.groupys.dto.apple.AppleChartsResult;
import com.groupys.mapper.AlbumMapper;
import com.groupys.mapper.ArtistMapper;
import com.groupys.mapper.TrackMapper;
import com.groupys.model.Artist;
import com.groupys.model.Track;
import com.groupys.repository.ArtistRepository;
import com.groupys.repository.GenreRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@ApplicationScoped
public class ArtistService {

    @Inject
    AppleCatalogService appleCatalogService;

    @Inject
    AppleCatalogEntityService entityService;

    @Inject
    ArtistMapper artistMapper;

    @Inject
    AlbumMapper albumMapper;

    @Inject
    TrackMapper trackMapper;

    @Inject
    ArtistRepository artistRepository;

    @Inject
    GenreRepository genreRepository;

    public List<ArtistResDto> search(String query, int limit) {
        var response = appleCatalogService.search(appleCatalogService.resolveStorefront(null), query, limit);
        if (response == null || response.artists() == null) {
            return Collections.emptyList();
        }
        return response.artists().stream()
                .limit(Math.max(limit, 0))
                .map(this::upsertAndMap)
                .filter(dto -> dto != null)
                .toList();
    }

    @Transactional
    public ArtistResDto getById(Long id) {
        Artist existing = artistRepository.findByIdOrRoundedUnsafeSyntheticId(id).orElse(null);
        if (existing == null) {
            return null;
        }
        if (existing.getAppleMusicId() == null || existing.getAppleMusicId().isBlank()) {
            return artistMapper.toResDto(existing);
        }

        return appleCatalogService.getArtist(appleCatalogService.resolveStorefront(null), existing.getAppleMusicId())
                .map(artist -> artistMapper.toResDto(entityService.upsertArtist(artist), artistMapper.pickGenre(artist.genreNames())))
                .orElseGet(() -> artistMapper.toResDto(existing));
    }

    public List<TrackResDto> getTopTracks(Long artistId, int limit) {
        Artist artist = artistRepository.findByIdOrRoundedUnsafeSyntheticId(artistId).orElse(null);
        if (artist == null || artist.getAppleMusicId() == null || artist.getAppleMusicId().isBlank()) {
            return Collections.emptyList();
        }
        String storefront = appleCatalogService.resolveStorefront(null);
        ArtistResDto artistDto = resolveByAppleReference(storefront, artist.getAppleMusicId(), artist.getName());
        List<AppleCatalogSong> songs = appleCatalogService.getArtistTopSongs(storefront, artist.getAppleMusicId(), limit);
        if (songs.isEmpty()) {
            return Collections.emptyList();
        }
        return songs.stream()
                .limit(Math.max(limit, 0))
                .map(song -> mapSong(song, artistDto))
                .filter(dto -> dto != null)
                .toList();
    }

    public List<ArtistResDto> getTopByCountry(String country) {
        String storefront = appleCatalogService.resolveStorefront(country);
        AppleChartsResult charts = appleCatalogService.getCharts(storefront, null, 10);
        return deriveArtistsFromCharts(storefront, charts, 10);
    }

    public List<ArtistResDto> getByGenre(String genreName, int limit) {
        if (genreName == null || genreName.isBlank()) {
            return Collections.emptyList();
        }
        int safeLimit = Math.max(limit, 1);
        String storefront = appleCatalogService.resolveStorefront(null);
        String genreId = genreRepository.findByNameIgnoreCase(genreName.trim())
                .map(genre -> genre.appleGenreId)
                .orElse(null);

        if (genreId != null && !genreId.isBlank()) {
            List<ArtistResDto> fromCharts = deriveArtistsFromCharts(
                    storefront,
                    appleCatalogService.getCharts(storefront, genreId, safeLimit),
                    safeLimit
            );
            if (!fromCharts.isEmpty()) {
                return fromCharts;
            }
        }

        List<ArtistResDto> fromSearch = new ArrayList<>();
        var response = appleCatalogService.search(storefront, genreName, Math.max(safeLimit, 10));
        if (response != null && response.artists() != null) {
            for (AppleCatalogArtist artist : response.artists()) {
                if (matchesGenre(artist.genreNames(), genreName)) {
                    ArtistResDto dto = upsertAndMap(artist);
                    if (dto != null) {
                        fromSearch.add(dto);
                    }
                }
                if (fromSearch.size() >= safeLimit) {
                    break;
                }
            }
        }
        return fromSearch;
    }

    public ArtistResDto resolveByName(String artistName) {
        var response = appleCatalogService.search(appleCatalogService.resolveStorefront(null), artistName, 1);
        if (response == null || response.artists() == null || response.artists().isEmpty()) {
            return null;
        }
        return upsertAndMap(response.artists().getFirst());
    }

    public ArtistResDto resolveByAppleReference(String storefront, String artistId, String artistName) {
        if (artistId != null && !artistId.isBlank()) {
            var fetched = appleCatalogService.getArtist(storefront, artistId).orElse(null);
            if (fetched != null) {
                return artistMapper.toResDto(entityService.upsertArtist(fetched));
            }
            Artist fallback = entityService.upsertArtistReference(artistId, artistName, null, null, null, null);
            return fallback != null ? artistMapper.toResDto(fallback) : null;
        }
        return resolveByName(artistName);
    }

    List<ArtistResDto> deriveArtistsFromCharts(String storefront, AppleChartsResult charts, int limit) {
        if (charts == null) {
            return List.of();
        }
        Map<String, WeightedArtistRef> weighted = new LinkedHashMap<>();

        List<AppleCatalogSong> songs = charts.topSongs() != null ? charts.topSongs() : List.of();
        for (int index = 0; index < songs.size(); index++) {
            AppleCatalogSong song = songs.get(index);
            addWeightedArtist(weighted, song.artistId(), song.artistName(), ((songs.size() - index) * 2d));
        }

        List<com.groupys.dto.apple.AppleCatalogAlbum> albums = charts.topAlbums() != null ? charts.topAlbums() : List.of();
        for (int index = 0; index < albums.size(); index++) {
            var album = albums.get(index);
            addWeightedArtist(weighted, album.artistId(), album.artistName(), albums.size() - index);
        }

        return weighted.values().stream()
                .sorted(Comparator.comparingDouble(WeightedArtistRef::score).reversed())
                .limit(Math.max(limit, 0))
                .map(ref -> resolveByAppleReference(storefront, ref.artistId(), ref.artistName()))
                .filter(dto -> dto != null)
                .toList();
    }

    private void addWeightedArtist(Map<String, WeightedArtistRef> weighted,
                                   String artistId,
                                   String artistName,
                                   double score) {
        if ((artistId == null || artistId.isBlank()) && (artistName == null || artistName.isBlank())) {
            return;
        }
        String key = artistId != null && !artistId.isBlank()
                ? "id:" + artistId
                : "name:" + artistName.trim().toLowerCase(Locale.ROOT);
        weighted.compute(key, (ignored, current) -> {
            if (current == null) {
                return new WeightedArtistRef(artistId, artistName, score);
            }
            return new WeightedArtistRef(
                    current.artistId() != null ? current.artistId() : artistId,
                    current.artistName() != null ? current.artistName() : artistName,
                    current.score() + score
            );
        });
    }

    private TrackResDto mapSong(AppleCatalogSong song, ArtistResDto overrideArtist) {
        Track track = entityService.upsertTrack(song);
        if (track == null) {
            return null;
        }
        ArtistResDto artistDto = overrideArtist != null
                ? overrideArtist
                : (track.getArtist() != null ? artistMapper.toResDto(track.getArtist()) : null);
        var album = track.getAlbum();
        var albumDto = album != null
                ? albumMapper.toResDto(album)
                : trackMapper.toAlbumReference(
                        song.albumId() != null ? com.groupys.util.MusicIdentityUtil.syntheticAlbumId(song.albumId(), song.albumName(), song.artistName()) : null,
                        song.albumName(),
                        song.artworkUrlTemplate(),
                        song.artworkWidth(),
                        song.artworkHeight()
                );
        return trackMapper.toResDto(track.getId(), song, artistDto, albumDto);
    }

    private ArtistResDto upsertAndMap(AppleCatalogArtist artist) {
        Artist entity = entityService.upsertArtist(artist);
        if (entity == null) {
            return null;
        }
        return artistMapper.toResDto(entity);
    }

    private boolean matchesGenre(List<String> genreNames, String genreName) {
        if (genreNames == null || genreNames.isEmpty() || genreName == null || genreName.isBlank()) {
            return false;
        }
        String expected = genreName.trim().toLowerCase(Locale.ROOT);
        return genreNames.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(value -> value.trim().toLowerCase(Locale.ROOT))
                .anyMatch(value -> value.equals(expected));
    }

    private record WeightedArtistRef(String artistId, String artistName, double score) {
    }
}
