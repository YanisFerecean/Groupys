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
                artistService.search(query, 5),
                albumService.search(query, 5),
                trackService.search(query, 5)
        );
    }
}
