package com.groupys.client;

import com.groupys.dto.lastfm.LastFmArtistInfoResponse;
import com.groupys.dto.lastfm.LastFmChartArtistsResponse;
import com.groupys.dto.lastfm.LastFmChartTracksResponse;
import com.groupys.dto.lastfm.LastFmGeoTracksResponse;
import com.groupys.dto.lastfm.LastFmTagAlbumsResponse;
import com.groupys.dto.lastfm.LastFmTopArtistsResponse;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.QueryParam;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

@Path("/")
@RegisterRestClient(configKey = "lastfm-api")
public interface LastFmClient {

    @GET
    LastFmArtistInfoResponse getArtistInfo(@QueryParam("method") String method,
                                           @QueryParam("artist") String artist,
                                           @QueryParam("api_key") String apiKey,
                                           @QueryParam("format") String format);

    @GET
    LastFmTopArtistsResponse getTopArtists(@QueryParam("method") String method,
                                           @QueryParam("country") String country,
                                           @QueryParam("api_key") String apiKey,
                                           @QueryParam("format") String format);

    @GET
    LastFmChartTracksResponse getChartTopTracks(@QueryParam("method") String method,
                                                @QueryParam("api_key") String apiKey,
                                                @QueryParam("format") String format);

    @GET
    LastFmChartArtistsResponse getChartTopArtists(@QueryParam("method") String method,
                                                  @QueryParam("api_key") String apiKey,
                                                  @QueryParam("format") String format);

    @GET
    LastFmGeoTracksResponse getGeoTopTracks(@QueryParam("method") String method,
                                            @QueryParam("country") String country,
                                            @QueryParam("api_key") String apiKey,
                                            @QueryParam("format") String format);

    @GET
    LastFmTagAlbumsResponse getTagTopAlbums(@QueryParam("method") String method,
                                            @QueryParam("tag") String tag,
                                            @QueryParam("api_key") String apiKey,
                                            @QueryParam("format") String format);
}
