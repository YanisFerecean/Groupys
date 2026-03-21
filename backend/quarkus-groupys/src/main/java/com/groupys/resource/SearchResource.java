package com.groupys.resource;

import com.groupys.dto.SearchResDto;
import com.groupys.service.SearchService;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;

@Path("/search")
@Produces(MediaType.APPLICATION_JSON)
public class SearchResource {

    @Inject
    SearchService searchService;

    @GET
    public SearchResDto search(@QueryParam("q") String query) {
        return searchService.search(query);
    }
}
