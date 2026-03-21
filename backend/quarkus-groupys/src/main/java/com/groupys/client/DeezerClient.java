package com.groupys.client;

import com.groupys.dto.deezer.DeezerAlbumDto;
import com.groupys.dto.deezer.DeezerAlbumSearchResponse;
import com.groupys.dto.deezer.DeezerArtistDto;
import com.groupys.dto.deezer.DeezerArtistSearchResponse;
import com.groupys.dto.deezer.DeezerTrackSearchResponse;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

@Path("/")
@RegisterRestClient(configKey = "deezer-api")
public interface DeezerClient {

    @GET
    @Path("/search/artist")
    DeezerArtistSearchResponse searchArtists(@QueryParam("q") String query,
                                             @QueryParam("limit") int limit);

    @GET
    @Path("/search/album")
    DeezerAlbumSearchResponse searchAlbums(@QueryParam("q") String query,
                                           @QueryParam("limit") int limit);

    @GET
    @Path("/search/track")
    DeezerTrackSearchResponse searchTracks(@QueryParam("q") String query,
                                           @QueryParam("limit") int limit);

    @GET
    @Path("/artist/{id}")
    DeezerArtistDto getArtistById(@PathParam("id") Long id);

    @GET
    @Path("/album/{id}")
    DeezerAlbumDto getAlbumById(@PathParam("id") Long id);

    @GET
    @Path("/artist/{id}/top")
    DeezerTrackSearchResponse getArtistTopTracks(@PathParam("id") Long id,
                                                 @QueryParam("limit") int limit);
}
