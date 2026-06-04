package com.groupys.service;

import com.groupys.dto.apple.AppleCatalogAlbum;
import com.groupys.dto.apple.AppleCatalogArtist;
import com.groupys.dto.apple.AppleCatalogSong;
import com.groupys.model.Album;
import com.groupys.model.Artist;
import com.groupys.model.Track;
import com.groupys.repository.AlbumRepository;
import com.groupys.repository.ArtistRepository;
import com.groupys.repository.TrackRepository;
import com.groupys.util.MusicIdentityUtil;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@ApplicationScoped
public class AppleCatalogEntityService {

    private static final List<Integer> ARTIST_IMAGE_SIZES = List.of(120, 240, 480, 1000);
    private static final int ALBUM_SMALL = 120;
    private static final int ALBUM_MEDIUM = 300;
    private static final int ALBUM_BIG = 600;
    private static final int ALBUM_XL = 1200;

    @Inject
    ArtistRepository artistRepository;

    @Inject
    AlbumRepository albumRepository;

    @Inject
    TrackRepository trackRepository;

    @Transactional
    public Artist upsertArtist(AppleCatalogArtist artist) {
        if (artist == null) {
            return null;
        }
        return upsertArtistReference(
                artist.id(),
                artist.name(),
                artist.artworkUrlTemplate(),
                artist.artworkWidth(),
                artist.artworkHeight(),
                firstNonBlank(artist.editorialNotesStandard(), artist.editorialNotesShort())
        );
    }

    @Transactional
    public Artist upsertArtistReference(String appleMusicId,
                                        String name,
                                        String artworkUrlTemplate,
                                        Integer artworkWidth,
                                        Integer artworkHeight,
                                        String summary) {
        if (isBlank(appleMusicId) && isBlank(name)) {
            return null;
        }

        Artist artist = !isBlank(appleMusicId)
                ? artistRepository.findByAppleMusicId(appleMusicId).orElse(null)
                : null;
        if (artist == null && !isBlank(name)) {
            artist = artistRepository.findByNameIgnoreCase(name).orElse(null);
        }
        boolean isNew = artist == null;
        if (isNew) {
            if (isBlank(name)) {
                return null;
            }
            artist = new Artist();
            artist.setId(MusicIdentityUtil.syntheticArtistId(appleMusicId, name));
            artist.setName(name);
            if (!isBlank(appleMusicId)) {
                artist.setAppleMusicId(appleMusicId);
            }
            artistRepository.persist(artist);
        } else {
            if (!isBlank(appleMusicId)) {
                artist.setAppleMusicId(appleMusicId);
            }
            if (!isBlank(name)) {
                artist.setName(name);
            }
        }
        List<String> images = buildArtworkVariants(artworkUrlTemplate, artworkWidth, artworkHeight, ARTIST_IMAGE_SIZES);
        if (!images.isEmpty()) {
            artist.setImages(images);
        }
        artist.setListeners(null);
        artist.setPlaycount(null);
        if (!isBlank(summary)) {
            artist.setSummary(summary);
        }
        return artist;
    }

    @Transactional
    public Album upsertAlbum(AppleCatalogAlbum album) {
        if (album == null) {
            return null;
        }
        Artist artist = upsertArtistReference(album.artistId(), album.artistName(), null, null, null, null);
        Album entity = resolveAlbum(album.id(), album.name(), album.artistName());
        if (entity == null) {
            if (isBlank(album.name())) {
                return null;
            }
            entity = new Album();
            entity.setId(MusicIdentityUtil.syntheticAlbumId(album.id(), album.name(), album.artistName()));
            entity.setTitle(album.name());
            if (!isBlank(album.id())) {
                entity.setAppleMusicId(album.id());
            }
            albumRepository.persist(entity);
        }
        applyAlbum(entity, album, artist);
        return entity;
    }

    @Transactional
    public Album upsertAlbumReference(String appleAlbumId,
                                      String albumName,
                                      Artist artist,
                                      String artworkUrlTemplate,
                                      Integer artworkWidth,
                                      Integer artworkHeight) {
        if (isBlank(appleAlbumId) && isBlank(albumName)) {
            return null;
        }
        String artistName = artist != null ? artist.getName() : null;
        Album entity = resolveAlbum(appleAlbumId, albumName, artistName);
        boolean isNew = entity == null;
        if (isNew) {
            if (isBlank(albumName)) {
                return null;
            }
            entity = new Album();
            entity.setId(MusicIdentityUtil.syntheticAlbumId(appleAlbumId, albumName, artistName));
            entity.setTitle(albumName);
            if (!isBlank(appleAlbumId)) {
                entity.setAppleMusicId(appleAlbumId);
            }
            if (artist != null) {
                entity.setArtist(artist);
            }
            albumRepository.persist(entity);
        } else {
            if (!isBlank(appleAlbumId)) {
                entity.setAppleMusicId(appleAlbumId);
            }
            if (!isBlank(albumName)) {
                entity.setTitle(albumName);
            }
            if (artist != null) {
                entity.setArtist(artist);
            }
        }
        applyAlbumArtwork(entity, artworkUrlTemplate, artworkWidth, artworkHeight);
        return entity;
    }

    @Transactional
    public Track upsertTrack(AppleCatalogSong song) {
        return upsertTrack(song, null);
    }

    @Transactional
    public Track upsertTrack(AppleCatalogSong song, Integer rank) {
        if (song == null) {
            return null;
        }
        Artist artist = upsertArtistReference(song.artistId(), song.artistName(), null, null, null, null);
        Album album = upsertAlbumReference(
                song.albumId(),
                song.albumName(),
                artist,
                song.artworkUrlTemplate(),
                song.artworkWidth(),
                song.artworkHeight()
        );

        String primaryArtist = artist != null ? artist.getName() : song.artistName();
        Track track = resolveTrack(song.id(), song.isrc(), song.name(), primaryArtist);
        boolean isNew = track == null;
        if (isNew) {
            if (isBlank(song.name())) {
                return null;
            }
            track = new Track();
            track.setId(MusicIdentityUtil.syntheticTrackId(song.id(), song.name(), primaryArtist));
            track.setTitle(song.name());
            if (!isBlank(song.id())) {
                track.setAppleMusicId(song.id());
            }
            trackRepository.persist(track);
        } else {
            if (!isBlank(song.id())) {
                track.setAppleMusicId(song.id());
            }
            if (!isBlank(song.name())) {
                track.setTitle(song.name());
            }
        }
        track.setPreview(song.previewUrl());
        track.setDuration(song.durationInMillis() != null ? Math.max(0, song.durationInMillis() / 1000) : null);
        track.setExternalIsrc(!isBlank(song.isrc()) ? song.isrc() : track.getExternalIsrc());
        track.setArtist(artist);
        track.setAlbum(album);
        if (rank != null) {
            track.setRank(rank);
        }
        return track;
    }

    public String buildArtworkUrl(String template, Integer sourceWidth, Integer sourceHeight, int targetSize) {
        if (isBlank(template)) {
            return null;
        }
        int width = sourceWidth != null ? Math.min(sourceWidth, targetSize) : targetSize;
        int height = sourceHeight != null ? Math.min(sourceHeight, targetSize) : targetSize;
        return template.replace("{w}", String.valueOf(width))
                .replace("{h}", String.valueOf(height))
                .replace("{f}", "jpg");
    }

    public List<String> buildArtworkVariants(String template, Integer sourceWidth, Integer sourceHeight, List<Integer> sizes) {
        if (isBlank(template) || sizes == null || sizes.isEmpty()) {
            return List.of();
        }
        Set<String> variants = new LinkedHashSet<>();
        for (Integer size : sizes) {
            if (size == null || size <= 0) {
                continue;
            }
            String url = buildArtworkUrl(template, sourceWidth, sourceHeight, size);
            if (!isBlank(url)) {
                variants.add(url);
            }
        }
        return List.copyOf(variants);
    }

    public void applyAlbumArtwork(Album album, String template, Integer sourceWidth, Integer sourceHeight) {
        if (album == null || isBlank(template)) {
            return;
        }
        album.setCoverSmall(buildArtworkUrl(template, sourceWidth, sourceHeight, ALBUM_SMALL));
        album.setCoverMedium(buildArtworkUrl(template, sourceWidth, sourceHeight, ALBUM_MEDIUM));
        album.setCoverBig(buildArtworkUrl(template, sourceWidth, sourceHeight, ALBUM_BIG));
        album.setCoverXl(buildArtworkUrl(template, sourceWidth, sourceHeight, ALBUM_XL));
    }

    private void applyAlbum(Album entity, AppleCatalogAlbum album, Artist artist) {
        if (!isBlank(album.id())) {
            entity.setAppleMusicId(album.id());
        }
        if (!isBlank(album.name())) {
            entity.setTitle(album.name());
        }
        applyAlbumArtwork(entity, album.artworkUrlTemplate(), album.artworkWidth(), album.artworkHeight());
        entity.setReleaseDate(album.releaseDate());
        entity.setLabel(album.recordLabel());
        entity.setNbTracks(album.trackCount());
        entity.setFans(null);
        entity.setGenres(copyGenres(album.genreNames()));
        entity.setArtist(artist);
        Integer duration = deriveDurationSeconds(album.tracks());
        if (duration != null || album.tracks() != null) {
            entity.setDuration(duration);
        }
    }

    private Album resolveAlbum(String appleMusicId, String albumName, String artistName) {
        Album album = !isBlank(appleMusicId)
                ? albumRepository.findByAppleMusicId(appleMusicId).orElse(null)
                : null;
        if (album == null) {
            album = albumRepository.findByTitleAndArtistNameIgnoreCase(albumName, artistName).orElse(null);
        }
        return album;
    }

    private Track resolveTrack(String appleMusicId, String isrc, String title, String artistName) {
        Track track = !isBlank(appleMusicId)
                ? trackRepository.findByAppleMusicId(appleMusicId).orElse(null)
                : null;
        if (track == null && !isBlank(isrc)) {
            track = trackRepository.findByExternalIsrc(isrc).orElse(null);
        }
        if (track == null) {
            track = trackRepository.findByTitleAndArtistNameIgnoreCase(title, artistName).orElse(null);
        }
        return track;
    }

    private Integer deriveDurationSeconds(List<AppleCatalogSong> tracks) {
        if (tracks == null || tracks.isEmpty()) {
            return null;
        }
        int totalMillis = 0;
        boolean hasDuration = false;
        for (AppleCatalogSong track : tracks) {
            if (track == null || track.durationInMillis() == null) {
                continue;
            }
            totalMillis += Math.max(track.durationInMillis(), 0);
            hasDuration = true;
        }
        return hasDuration ? Math.max(totalMillis / 1000, 0) : null;
    }

    private List<String> copyGenres(List<String> genres) {
        if (genres == null || genres.isEmpty()) {
            return List.of();
        }
        List<String> copy = new ArrayList<>();
        for (String genre : genres) {
            if (!isBlank(genre)) {
                copy.add(genre.trim());
            }
        }
        return List.copyOf(copy);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String firstNonBlank(String first, String second) {
        if (!isBlank(first)) {
            return first;
        }
        if (!isBlank(second)) {
            return second;
        }
        return null;
    }
}
