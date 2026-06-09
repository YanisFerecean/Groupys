package com.groupys.resource;

import com.fasterxml.jackson.databind.JsonNode;
import com.groupys.dto.DailySongResDto;
import com.groupys.service.DailySongService;
import io.quarkus.security.Authenticated;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;

import java.util.List;

@Path("/daily-song")
@Authenticated
@RequestScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@SecurityRequirement(name = "bearerAuth")
public class DailySongResource {

    @Inject
    DailySongService dailySongService;

    @Inject
    JsonWebToken jwt;

    /** body: a track payload (must contain a title). */
    @POST
    public DailySongResDto post(JsonNode track) {
        return dailySongService.post(jwt.getSubject(), track);
    }

    @GET
    @Path("/feed")
    public List<DailySongResDto> feed() {
        return dailySongService.feed(jwt.getSubject());
    }

    @DELETE
    public Response delete() {
        dailySongService.deleteOwn(jwt.getSubject());
        return Response.noContent().build();
    }
}
