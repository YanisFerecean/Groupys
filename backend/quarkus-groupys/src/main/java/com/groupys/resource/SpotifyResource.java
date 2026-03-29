package com.groupys.resource;

import com.groupys.dto.SpotifyAlbumResDto;
import com.groupys.dto.SpotifyArtistResDto;
import com.groupys.dto.SpotifyTrackResDto;
import com.groupys.service.SpotifyService;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;

import java.net.URI;
import java.util.List;
import java.util.Map;

@Path("/spotify")
@Produces(MediaType.APPLICATION_JSON)
public class SpotifyResource {

    @Inject
    SpotifyService spotifyService;

    @Inject
    JsonWebToken jwt;

    @Inject
    @org.eclipse.microprofile.config.inject.ConfigProperty(name = "spotify.frontend.url")
    String frontendUrl;

    @GET
    @Path("/auth-url")
    @Authenticated
    @SecurityRequirement(name = "bearerAuth")
    public Response getAuthUrl(@QueryParam("redirect_uri") String customRedirectUri) {
        String clerkId = jwt.getSubject();
        String url = spotifyService.buildAuthorizationUrl(clerkId, customRedirectUri);
        return Response.ok(Map.of("url", url)).build();
    }

    @POST
    @Path("/callback")
    @Authenticated
    @SecurityRequirement(name = "bearerAuth")
    public Response mobileCallback(Map<String, String> payload) {
        String code = payload.get("code");
        String redirectUri = payload.get("redirect_uri");
        if (code == null) return Response.status(Response.Status.BAD_REQUEST).build();
        
        spotifyService.handleCallback(code, jwt.getSubject(), redirectUri);
        return Response.ok().build();
    }

    @GET
    @Path("/callback")
    public Response callback(@QueryParam("code") String code,
                             @QueryParam("state") String clerkId,
                             @QueryParam("error") String error) {
        if (error != null || code == null) {
            return Response.temporaryRedirect(
                    URI.create(frontendUrl + "/profile?spotify=error")).build();
        }
        try {
            spotifyService.handleCallback(code, clerkId, null);
            return Response.temporaryRedirect(
                    URI.create(frontendUrl + "/profile?spotify=connected")).build();
        } catch (Exception e) {
            return Response.temporaryRedirect(
                    URI.create(frontendUrl + "/profile?spotify=error")).build();
        }
    }

    @GET
    @Path("/top-artists")
    @Authenticated
    @SecurityRequirement(name = "bearerAuth")
    public List<SpotifyArtistResDto> topArtists() {
        return spotifyService.getTopArtists(jwt.getSubject());
    }

    @GET
    @Path("/users/{userId}/top-artists")
    @Authenticated
    @SecurityRequirement(name = "bearerAuth")
    public List<SpotifyArtistResDto> topArtistsByUser(@PathParam("userId") String userId) {
        return spotifyService.getTopArtistsByUserId(userId);
    }

    @GET
    @Path("/top-tracks")
    @Authenticated
    @SecurityRequirement(name = "bearerAuth")
    public List<SpotifyTrackResDto> topTracks() {
        return spotifyService.getTopTracks(jwt.getSubject());
    }

    @GET
    @Path("/users/{userId}/top-tracks")
    @Authenticated
    @SecurityRequirement(name = "bearerAuth")
    public List<SpotifyTrackResDto> topTracksByUser(@PathParam("userId") String userId) {
        return spotifyService.getTopTracksByUserId(userId);
    }

    @GET
    @Path("/saved-albums")
    @Authenticated
    @SecurityRequirement(name = "bearerAuth")
    public List<SpotifyAlbumResDto> savedAlbums() {
        return spotifyService.getTopAlbums(jwt.getSubject());
    }

    @GET
    @Path("/users/{userId}/saved-albums")
    @Authenticated
    @SecurityRequirement(name = "bearerAuth")
    public List<SpotifyAlbumResDto> savedAlbumsByUser(@PathParam("userId") String userId) {
        return spotifyService.getTopAlbumsByUserId(userId);
    }

    @GET
    @Path("/currently-playing")
    @Authenticated
    @SecurityRequirement(name = "bearerAuth")
    public Response currentlyPlaying() {
        SpotifyTrackResDto track = spotifyService.getCurrentlyPlaying(jwt.getSubject());
        if (track == null) return Response.noContent().build();
        return Response.ok(track).build();
    }

    @GET
    @Path("/users/{userId}/currently-playing")
    @Authenticated
    @SecurityRequirement(name = "bearerAuth")
    public Response currentlyPlayingByUser(@PathParam("userId") String userId) {
        SpotifyTrackResDto track = spotifyService.getCurrentlyPlayingByUserId(userId);
        if (track == null) return Response.noContent().build();
        return Response.ok(track).build();
    }

    @DELETE
    @Path("/disconnect")
    @Authenticated
    @SecurityRequirement(name = "bearerAuth")
    public Response disconnect() {
        spotifyService.disconnect(jwt.getSubject());
        return Response.noContent().build();
    }
}
