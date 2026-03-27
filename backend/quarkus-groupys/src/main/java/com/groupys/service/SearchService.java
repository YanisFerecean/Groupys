package com.groupys.service;

import com.groupys.dto.SearchResDto;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class SearchService {

    @Inject
    ArtistService artistService;

    @Inject
    AlbumService albumService;

    @Inject
    TrackService trackService;

    public SearchResDto search(String query) {
        return new SearchResDto(
                artistService.search(query, 3),
                albumService.search(query, 3),
                trackService.search(query, 3)
        );
    }
}
