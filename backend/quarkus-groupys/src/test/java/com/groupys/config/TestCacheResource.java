package com.groupys.config;

import io.quarkus.security.Authenticated;
import jakarta.annotation.security.PermitAll;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

/**
 * Test-only resource exercising {@link CacheControlResponseFilter} end-to-end: a protected and a
 * public endpoint, neither touching the DB. Top-level (not nested) so Quarkus indexes it as a
 * JAX-RS resource.
 */
@Path("/test-cache")
@Produces(MediaType.TEXT_PLAIN)
public class TestCacheResource {

    @GET
    @Path("/secure")
    @Authenticated
    public String secure() {
        return "ok";
    }

    @GET
    @Path("/public")
    @PermitAll
    public String open() {
        return "ok";
    }
}
