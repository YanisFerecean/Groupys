package com.groupys.service;

import com.groupys.client.DeezerClient;
import com.groupys.dto.TrackResDto;
import com.groupys.dto.deezer.DeezerTrackSearchResponse;
import com.groupys.mapper.TrackMapper;
import com.groupys.model.Track;
import com.groupys.repository.TrackRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.rest.client.inject.RestClient;

import java.util.Collections;
import java.util.List;

@ApplicationScoped
public class TrackService {

    @Inject
    @RestClient
    DeezerClient deezerClient;

    @Inject
    TrackMapper trackMapper;

    @Inject
    TrackRepository trackRepository;

    public List<TrackResDto> search(String query, int limit) {
        DeezerTrackSearchResponse response = deezerClient.searchTracks(query, limit);
        if (response == null || response.data() == null) {
            return Collections.emptyList();
        }
        return response.data().stream()
                .map(trackMapper::toResDto)
                .toList();
    }

    public TrackResDto getById(Long id) {
        Track existing = trackRepository.findById(id);
        if (existing != null) {
            return trackMapper.toResDto(existing);
        }
        return null;
    }
}
