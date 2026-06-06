package com.groupys.resource;

import com.groupys.dto.ReportCreateDto;
import com.groupys.dto.ReportResDto;
import com.groupys.service.ModerationService;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;

import java.net.URI;
import java.util.List;

@Path("/reports")
@Authenticated
@RequestScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@SecurityRequirement(name = "bearerAuth")
public class ReportResource {

    @Inject
    ModerationService moderationService;

    @Inject
    JsonWebToken jwt;

    /** File a report against a user, message, post, or community. */
    @POST
    public Response createReport(@Valid ReportCreateDto dto) {
        ReportResDto created = moderationService.createReport(jwt.getSubject(), dto);
        return Response.created(URI.create("/api/reports/" + created.id())).entity(created).build();
    }

    /** Admin review surface: list reports, newest first, optionally filtered by status. */
    @GET
    @RolesAllowed("ADMIN")
    public List<ReportResDto> listReports(
            @QueryParam("status") String status,
            @DefaultValue("0") @QueryParam("page") int page,
            @DefaultValue("50") @QueryParam("size") int size) {
        return moderationService.listReports(status, page, size);
    }
}
