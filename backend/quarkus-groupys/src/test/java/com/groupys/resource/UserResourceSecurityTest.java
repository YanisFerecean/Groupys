package com.groupys.resource;

import io.quarkus.security.Authenticated;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class UserResourceSecurityTest {

    @Test
    void userResourceRequiresAuthentication() {
        Authenticated authenticated = UserResource.class.getAnnotation(Authenticated.class);

        assertNotNull(authenticated, "UserResource should require authentication");
    }

    @Test
    void userResourceDeclaresBearerSecurityForOpenApi() {
        SecurityRequirement securityRequirement = UserResource.class.getAnnotation(SecurityRequirement.class);

        assertNotNull(securityRequirement, "UserResource should declare the bearer auth requirement");
        assertEquals("bearerAuth", securityRequirement.name());
    }
}
