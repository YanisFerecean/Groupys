package com.groupys.config;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;

/**
 * End-to-end check of {@link CacheControlResponseFilter} through the real HTTP/JAX-RS pipeline,
 * driving the test-only {@link TestCacheResource} so the assertion isolates the filter from any
 * DB-backed handler. {@code @TestSecurity} supplies the authenticated identity the filter keys off.
 */
@QuarkusTest
class CacheControlResponseFilterHttpTest {

    @Test
    @TestSecurity(user = "user_test", roles = "user")
    void authenticatedEndpointGetsNoStore() {
        given()
                .when().get("/test-cache/secure")
                .then()
                .statusCode(200)
                .header("Cache-Control", "private, no-store")
                .header("Vary", Matchers.containsString("Authorization"));
    }

    @Test
    void publicEndpointStaysCacheable() {
        given()
                .when().get("/test-cache/public")
                .then()
                .statusCode(200)
                .header("Cache-Control", Matchers.nullValue());
    }
}
