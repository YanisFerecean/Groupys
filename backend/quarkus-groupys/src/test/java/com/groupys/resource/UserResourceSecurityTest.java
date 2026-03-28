package com.groupys.resource;

import io.quarkus.security.Authenticated;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

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

    @Test
    void userResourceExposesSearchEndpoint() throws NoSuchMethodException {
        Method method = UserResource.class.getDeclaredMethod("search", String.class, int.class);

        assertNotNull(method.getAnnotation(jakarta.ws.rs.GET.class), "search should be a GET endpoint");
        assertEquals("/search", method.getAnnotation(jakarta.ws.rs.Path.class).value());
        assertTrue(method.getParameterCount() == 2);
    }
}
