package com.groupys.resource;

import com.groupys.dto.UserCreateDto;
import com.groupys.dto.UserFollowResDto;
import com.groupys.dto.UserResDto;
import com.groupys.dto.UserUpdateDto;
import com.groupys.service.DiscoveryService;
import com.groupys.service.UserService;
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

@Path("/users")
@Authenticated
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@SecurityRequirement(name = "bearerAuth")
public class UserResource {

    @Inject
    UserService userService;

    @Inject
    DiscoveryService discoveryService;

    @Inject
    JsonWebToken jwt;

    @GET
    public List<UserResDto> list() {
        return userService.listAll();
    }

    @GET
    @Path("/search")
    public List<UserResDto> search(@QueryParam("q") String query,
                                   @QueryParam("limit") @DefaultValue("10") int limit) {
        return userService.search(jwt.getSubject(), query, limit);
    }

    @GET
    @Path("/{id}")
    public UserResDto getById(@PathParam("id") UUID id) {
        return userService.getById(id);
    }

    @GET
    @Path("/username/{username}")
    public UserResDto getByUsername(@PathParam("username") String username) {
        return userService.getByUsername(username);
    }

    @GET
    @Path("/clerk/{clerkId}")
    public UserResDto getByClerkId(@PathParam("clerkId") String clerkId) {
        return userService.getByClerkId(clerkId);
    }

    @POST
    public Response create(@Valid UserCreateDto dto) {
        if (userService.findByClerkId(dto.clerkId()).isPresent()) {
            return Response.status(Response.Status.CONFLICT)
                    .entity("{\"error\":\"User with this clerkId already exists\"}")
                    .build();
        }
        UserResDto created = userService.create(dto);
        return Response.created(URI.create("/api/users/" + created.id())).entity(created).build();
    }

    @PUT
    @Path("/{id}")
    public UserResDto update(@PathParam("id") UUID id, @Valid UserUpdateDto dto) {
        return userService.update(id, dto);
    }

    @POST
    @Path("/{id}/follow")
    public UserFollowResDto follow(@PathParam("id") UUID id) {
        return discoveryService.followUser(jwt.getSubject(), id);
    }

    @DELETE
    @Path("/{id}")
    public Response delete(@PathParam("id") UUID id) {
        userService.delete(id);
        return Response.noContent().build();
    }
}
