package com.groupys.client;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

@Path("/v1")
@RegisterRestClient(configKey = "apple-music-api")
public interface AppleMusicApiClient {

    @GET
    @Path("/me/storefront")
    Response getMyStorefront(@HeaderParam("Authorization") String bearer,
                             @HeaderParam("Music-User-Token") String musicUserToken);

    @GET
    @Path("/me/music-summaries")
    Response getMusicSummaries(@HeaderParam("Authorization") String bearer,
                               @HeaderParam("Music-User-Token") String musicUserToken,
                               @QueryParam("filter[year]") String year,
                               @QueryParam("views") String views);

    @GET
    @Path("/me/recent/played/tracks")
    Response getRecentlyPlayedTracks(@HeaderParam("Authorization") String bearer,
                                     @HeaderParam("Music-User-Token") String musicUserToken,
                                     @QueryParam("limit") int limit);

    @GET
    @Path("/me/history/heavy-rotation")
    Response getHeavyRotation(@HeaderParam("Authorization") String bearer,
                              @HeaderParam("Music-User-Token") String musicUserToken,
                              @QueryParam("limit") int limit);
}
