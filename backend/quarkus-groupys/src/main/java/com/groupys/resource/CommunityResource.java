package com.groupys.resource;

import com.groupys.dto.CommunityCreateDto;
import com.groupys.dto.CommunityMemberResDto;
import com.groupys.dto.CommunityResDto;
import com.groupys.dto.CommunityUpdateDto;
import com.groupys.service.CommunityService;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@Path("/communities")
@Authenticated
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@SecurityRequirement(name = "bearerAuth")
public class CommunityResource {

    @Inject
    CommunityService communityService;

    @Inject
    JsonWebToken jwt;

    @GET
    public List<CommunityResDto> list() {
        return communityService.listAll();
    }

    @GET
    @Path("/mine")
    public List<CommunityResDto> getMine() {
        return communityService.getJoinedCommunities(jwt.getSubject());
    }

    @GET
    @Path("/{id}")
    public CommunityResDto getById(@PathParam("id") UUID id) {
        return communityService.getById(id);
    }

    @GET
    @Path("/name/{name}")
    public CommunityResDto getByName(@PathParam("name") String name) {
        return communityService.getByName(name);
    }

    @GET
    @Path("/genre/{genre}")
    public List<CommunityResDto> getByGenre(@PathParam("genre") String genre) {
        return communityService.getByGenre(genre);
    }

    @GET
    @Path("/country/{country}")
    public List<CommunityResDto> getByCountry(@PathParam("country") String country) {
        return communityService.getByCountry(country);
    }

    @GET
    @Path("/artist/{artistId}")
    public List<CommunityResDto> getByArtist(@PathParam("artistId") Long artistId) {
        return communityService.getByArtist(artistId);
    }

    @POST
    @Path("/{id}/join")
    public CommunityResDto join(@PathParam("id") UUID id) {
        String clerkId = jwt.getSubject();
        return communityService.join(id, clerkId);
    }

    @POST
    @Path("/{id}/leave")
    public CommunityResDto leave(@PathParam("id") UUID id) {
        String clerkId = jwt.getSubject();
        return communityService.leave(id, clerkId);
    }

    @GET
    @Path("/{id}/members")
    public List<CommunityMemberResDto> getMembers(@PathParam("id") UUID id) {
        return communityService.getMembers(id);
    }

    @GET
    @Path("/{id}/membership")
    public Response checkMembership(@PathParam("id") UUID id) {
        String clerkId = jwt.getSubject();
        boolean member = communityService.isMember(id, clerkId);
        return Response.ok(java.util.Map.of("member", member)).build();
    }

    @POST
    public Response create(@Valid CommunityCreateDto dto) {
        String clerkId = jwt.getSubject();
        CommunityResDto created = communityService.create(dto, clerkId);
        return Response.created(URI.create("/api/communities/" + created.id())).entity(created).build();
    }

    @PUT
    @Path("/{id}")
    public CommunityResDto update(@PathParam("id") UUID id, @Valid CommunityUpdateDto dto) {
        return communityService.update(id, dto);
    }

    @DELETE
    @Path("/{id}")
    public Response delete(@PathParam("id") UUID id) {
        communityService.delete(id);
        return Response.noContent().build();
    }
}
