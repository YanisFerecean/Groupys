package com.groupys.resource;

import com.groupys.dto.DiscoveredPostResDto;
import com.groupys.dto.DiscoveryActionDto;
import com.groupys.dto.DiscoverySyncResDto;
import com.groupys.dto.LikeResponseDto;
import com.groupys.dto.SuggestedCommunityResDto;
import com.groupys.dto.SuggestedUserResDto;
import com.groupys.service.DiscoveryPostService;
import com.groupys.service.DiscoveryService;
import com.groupys.service.MatchService;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;

import java.util.List;
import java.util.UUID;

@Path("/discovery")
@Authenticated
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@SecurityRequirement(name = "bearerAuth")
public class DiscoveryResource {

    @Inject
    DiscoveryService discoveryService;

    @Inject
    DiscoveryPostService discoveryPostService;

    @Inject
    MatchService matchService;

    @Inject
    JsonWebToken jwt;

    @GET
    @Path("/posts/suggested")
    public List<DiscoveredPostResDto> suggestedPosts(@DefaultValue("10") @QueryParam("limit") int limit) {
        return discoveryPostService.getSuggestedPosts(jwt.getSubject(), limit);
    }

    @GET
    @Path("/communities/suggested")
    public List<SuggestedCommunityResDto> suggestedCommunities(@DefaultValue("20") @QueryParam("limit") int limit,
                                                               @DefaultValue("false") @QueryParam("refresh") boolean refresh) {
        return discoveryService.getSuggestedCommunities(jwt.getSubject(), limit, refresh);
    }

    @GET
    @Path("/users/suggested")
    public List<SuggestedUserResDto> suggestedUsers(@DefaultValue("20") @QueryParam("limit") int limit,
                                                    @DefaultValue("false") @QueryParam("refresh") boolean refresh) {
        return discoveryService.getSuggestedUsers(jwt.getSubject(), limit, refresh);
    }

    @POST
    @Path("/recommendations/{targetType}/{targetId}/dismiss")
    public Response dismiss(@PathParam("targetType") String targetType,
                            @PathParam("targetId") UUID targetId,
                            @Valid DiscoveryActionDto dto) {
        discoveryService.dismissRecommendation(jwt.getSubject(), targetType, targetId, dto);
        return Response.noContent().build();
    }

    @POST
    @Path("/users/{id}/like")
    public LikeResponseDto likeUser(@PathParam("id") UUID targetId) {
        return matchService.likeUser(jwt.getSubject(), targetId);
    }

    @DELETE
    @Path("/users/{id}/like")
    public Response withdrawLike(@PathParam("id") UUID targetId) {
        matchService.withdrawLike(jwt.getSubject(), targetId);
        return Response.noContent().build();
    }

    @POST
    @Path("/users/{id}/pass")
    public Response passUser(@PathParam("id") UUID targetId) {
        matchService.passUser(jwt.getSubject(), targetId);
        return Response.noContent().build();
    }

    @POST
    @Path("/music/sync")
    public DiscoverySyncResDto syncMusic() {
        return discoveryService.syncMusic(jwt.getSubject());
    }

    @POST
    @Path("/onboarding/artists")
    public Response saveOnboardingArtists(List<Long> artistIds) {
        discoveryService.saveOnboardingArtistPreferences(jwt.getSubject(), artistIds);
        return Response.noContent().build();
    }
}
