package com.groupys.resource;

import com.groupys.dto.TrackResDto;
import com.groupys.service.TrackService;
import jakarta.inject.Inject;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;

@Path("/tracks")
@Produces(MediaType.APPLICATION_JSON)
public class TrackResource {

    @Inject
    TrackService trackService;

    @GET
    @Path("/search")
    public List<TrackResDto> search(@QueryParam("q") String query,
                                    @DefaultValue("5") @QueryParam("limit") int limit) {
        return trackService.search(query, limit);
    }

    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") Long id) {
        TrackResDto track = trackService.getById(id);
        if (track == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(track).build();
    }
}
