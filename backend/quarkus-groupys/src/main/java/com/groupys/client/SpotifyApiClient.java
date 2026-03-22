package com.groupys.client;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

@Path("/v1")
@Consumes(MediaType.APPLICATION_JSON)
@RegisterRestClient(configKey = "spotify-api")
public interface SpotifyApiClient {

    @GET
    @Path("/me/top/artists")
    Response getTopArtists(@HeaderParam("Authorization") String bearer,
                           @QueryParam("limit") int limit,
                           @QueryParam("time_range") String timeRange);

    @GET
    @Path("/me/top/tracks")
    Response getTopTracks(@HeaderParam("Authorization") String bearer,
                          @QueryParam("limit") int limit,
                          @QueryParam("time_range") String timeRange);

    @GET
    @Path("/me/player/currently-playing")
    Response getCurrentlyPlaying(@HeaderParam("Authorization") String bearer);
}
