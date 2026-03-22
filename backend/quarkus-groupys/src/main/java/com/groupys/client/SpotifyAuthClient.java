package com.groupys.client;

import com.groupys.dto.spotify.SpotifyTokenResponse;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.FormParam;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

@Path("/api")
@RegisterRestClient(configKey = "spotify-auth")
public interface SpotifyAuthClient {

    @POST
    @Path("/token")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    SpotifyTokenResponse exchangeToken(@FormParam("grant_type") String grantType,
                                       @FormParam("code") String code,
                                       @FormParam("redirect_uri") String redirectUri,
                                       @HeaderParam("Authorization") String basicAuth);

    @POST
    @Path("/token")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    SpotifyTokenResponse refreshToken(@FormParam("grant_type") String grantType,
                                      @FormParam("refresh_token") String refreshToken,
                                      @HeaderParam("Authorization") String basicAuth);
}
