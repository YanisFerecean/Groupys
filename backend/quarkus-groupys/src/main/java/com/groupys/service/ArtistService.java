package com.groupys.service;

import com.groupys.client.DeezerClient;
import com.groupys.client.LastFmClient;
import com.groupys.dto.ArtistResDto;
import com.groupys.dto.TrackResDto;
import com.groupys.dto.deezer.DeezerArtistDto;
import com.groupys.dto.deezer.DeezerArtistSearchResponse;
import com.groupys.dto.deezer.DeezerTrackSearchResponse;
import com.groupys.dto.lastfm.LastFmArtistInfoResponse;
import com.groupys.dto.lastfm.LastFmTopArtistsResponse;
import com.groupys.mapper.ArtistMapper;
import com.groupys.mapper.TrackMapper;
import com.groupys.model.Artist;
import com.groupys.repository.ArtistRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.rest.client.inject.RestClient;

import java.util.Collections;
import java.util.List;

@ApplicationScoped
public class ArtistService {

    @Inject
    @RestClient
    DeezerClient deezerClient;

    @Inject
    @RestClient
    LastFmClient lastFmClient;

    @Inject
    ArtistMapper artistMapper;

    @Inject
    TrackMapper trackMapper;

    @Inject
    ArtistRepository artistRepository;

    @ConfigProperty(name = "lastfm.api.key")
    String lastfmApiKey;

    public List<ArtistResDto> search(String query, int limit) {
        DeezerArtistSearchResponse response = deezerClient.searchArtists(query, limit);
        if (response == null || response.data() == null) {
            return Collections.emptyList();
        }
        return response.data().stream()
                .map(this::enrichWithLastFm)
                .toList();
    }

    @Transactional
    public ArtistResDto getById(Long id) {
        Artist existing = artistRepository.findById(id);
        DeezerArtistDto deezerArtist;
        try {
            deezerArtist = deezerClient.getArtistById(id);
        } catch (Exception e) {
            deezerArtist = null;
        }

        if (!hasRequiredArtistData(deezerArtist)) {
            return existing != null ? artistMapper.toResDto(existing) : null;
        }

        LastFmArtistInfoResponse.LastFmArtistDetail lastfmDetail = fetchLastFmInfo(deezerArtist.name());
        ArtistResDto result = artistMapper.toResDto(deezerArtist, lastfmDetail);
        Artist entity = artistMapper.toEntity(deezerArtist, lastfmDetail);
        if (existing == null) {
            artistRepository.persist(entity);
        } else {
            mergeArtist(existing, entity);
        }

        return result;
    }

    public List<TrackResDto> getTopTracks(Long artistId, int limit) {
        DeezerTrackSearchResponse response = deezerClient.getArtistTopTracks(artistId, limit);
        if (response == null || response.data() == null) {
            return Collections.emptyList();
        }

        ArtistResDto enrichedArtist = getById(artistId);

        return response.data().stream()
                .map(t -> {
                    TrackResDto track = trackMapper.toResDto(t);
                    return new TrackResDto(
                            track.id(),
                            track.title(),
                            track.preview(),
                            track.duration(),
                            track.rank(),
                            enrichedArtist,
                            track.album()
                    );
                })
                .toList();
    }

    public List<ArtistResDto> getTopByCountry(String country) {
        LastFmTopArtistsResponse response = lastFmClient.getTopArtists(
                "geo.gettopartists", country, lastfmApiKey, "json");

        if (response == null || response.topartists() == null || response.topartists().artists() == null) {
            return Collections.emptyList();
        }

        return response.topartists().artists().stream()
                .limit(10)
                .map(a -> resolveByName(a.name()))
                .filter(a -> a != null)
                .toList();
    }

    public ArtistResDto resolveByName(String artistName) {
        try {
            DeezerArtistSearchResponse searchResponse = deezerClient.searchArtists(artistName, 1);
            if (searchResponse == null || searchResponse.data() == null || searchResponse.data().isEmpty()) {
                return null;
            }
            return enrichWithLastFm(searchResponse.data().getFirst());
        } catch (Exception e) {
            return null;
        }
    }

    private ArtistResDto enrichWithLastFm(DeezerArtistDto deezerArtist) {
        LastFmArtistInfoResponse.LastFmArtistDetail lastfmDetail = fetchLastFmInfo(deezerArtist.name());
        return artistMapper.toResDto(deezerArtist, lastfmDetail);
    }

    private LastFmArtistInfoResponse.LastFmArtistDetail fetchLastFmInfo(String artistName) {
        try {
            LastFmArtistInfoResponse response = lastFmClient.getArtistInfo(
                    "artist.getinfo", artistName, lastfmApiKey, "json");
            return response != null ? response.artist() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private Long parseLong(String value) {
        if (value == null || value.isBlank()) return null;
        return Long.parseLong(value);
    }

    private boolean hasRequiredArtistData(DeezerArtistDto deezerArtist) {
        return deezerArtist != null
                && deezerArtist.id() != null
                && deezerArtist.name() != null
                && !deezerArtist.name().isBlank();
    }

    private void mergeArtist(Artist existing, Artist incoming) {
        if (incoming.getName() != null && !incoming.getName().isBlank()) {
            existing.setName(incoming.getName());
        }
        if (incoming.getImages() != null && !incoming.getImages().isEmpty()) {
            existing.setImages(incoming.getImages());
        }
        if (incoming.getListeners() != null) {
            existing.setListeners(incoming.getListeners());
        }
        if (incoming.getPlaycount() != null) {
            existing.setPlaycount(incoming.getPlaycount());
        }
        if (incoming.getSummary() != null && !incoming.getSummary().isBlank()) {
            existing.setSummary(incoming.getSummary());
        }
    }
}
