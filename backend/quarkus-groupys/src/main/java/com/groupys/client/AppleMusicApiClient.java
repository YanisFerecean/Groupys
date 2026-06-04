package com.groupys.client;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
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

    @GET
    @Path("/catalog/{storefront}/search")
    Response search(@HeaderParam("Authorization") String bearer,
                    @PathParam("storefront") String storefront,
                    @QueryParam("term") String term,
                    @QueryParam("types") String types,
                    @QueryParam("limit") int limit);

    @GET
    @Path("/catalog/{storefront}/artists/{id}")
    Response getArtist(@HeaderParam("Authorization") String bearer,
                       @PathParam("storefront") String storefront,
                       @PathParam("id") String id,
                       @QueryParam("include") String include);

    @GET
    @Path("/catalog/{storefront}/artists")
    Response getArtists(@HeaderParam("Authorization") String bearer,
                        @PathParam("storefront") String storefront,
                        @QueryParam("ids") String ids,
                        @QueryParam("include") String include);

    @GET
    @Path("/catalog/{storefront}/albums/{id}")
    Response getAlbum(@HeaderParam("Authorization") String bearer,
                      @PathParam("storefront") String storefront,
                      @PathParam("id") String id,
                      @QueryParam("include") String include);

    @GET
    @Path("/catalog/{storefront}/songs/{id}")
    Response getSong(@HeaderParam("Authorization") String bearer,
                     @PathParam("storefront") String storefront,
                     @PathParam("id") String id);

    @GET
    @Path("/catalog/{storefront}/artists/{id}/view/top-songs")
    Response getArtistTopSongs(@HeaderParam("Authorization") String bearer,
                               @PathParam("storefront") String storefront,
                               @PathParam("id") String id,
                               @QueryParam("limit") int limit);

    @GET
    @Path("/catalog/{storefront}/charts")
    Response getCharts(@HeaderParam("Authorization") String bearer,
                       @PathParam("storefront") String storefront,
                       @QueryParam("types") String types,
                       @QueryParam("genre") String genreId,
                       @QueryParam("limit") int limit);

    @GET
    @Path("/catalog/{storefront}/genres")
    Response getGenres(@HeaderParam("Authorization") String bearer,
                       @PathParam("storefront") String storefront);
}
