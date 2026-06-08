package com.groupys.config;

import com.groupys.resource.PostResource;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ResourceInfo;
import jakarta.ws.rs.core.MultivaluedHashMap;
import jakarta.ws.rs.core.MultivaluedMap;
import org.junit.jupiter.api.Test;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Verifies {@link CacheControlResponseFilter} stamps no-store on authenticated responses while
 * leaving public {@code @PermitAll} endpoints and anonymous requests cacheable. References the
 * real {@link PostResource} methods so the test tracks the resource's actual annotations.
 */
class CacheControlResponseFilterTest {

    private static final Method AUTHED_METHOD = method("getMyPosts", int.class, int.class);
    private static final Method PUBLIC_META = method("getMeta", java.util.UUID.class);
    private static final Method PUBLIC_COUNT = method("getAuthorPostCount", java.util.UUID.class);

    @Test
    void authenticatedResponseIsMarkedNoStore() {
        MultivaluedMap<String, Object> headers = runFilter(AUTHED_METHOD, "Bearer realtoken", null);

        assertEquals("private, no-store", headers.getFirst("Cache-Control"));
        assertTrue(headers.get("Vary").contains("Authorization"), "should Vary on Authorization");
    }

    @Test
    void permitAllMetaEndpointStaysCacheable() {
        // Even when a logged-in client sends a token, the public endpoint must not be marked no-store.
        MultivaluedMap<String, Object> headers = runFilter(PUBLIC_META, "Bearer realtoken", null);

        assertFalse(headers.containsKey("Cache-Control"), "@PermitAll meta should stay cacheable");
    }

    @Test
    void permitAllCountEndpointStaysCacheable() {
        MultivaluedMap<String, Object> headers = runFilter(PUBLIC_COUNT, "Bearer realtoken", null);

        assertFalse(headers.containsKey("Cache-Control"), "@PermitAll count should stay cacheable");
    }

    @Test
    void anonymousRequestIsLeftUntouched() {
        MultivaluedMap<String, Object> headers = runFilter(AUTHED_METHOD, null, null);

        assertFalse(headers.containsKey("Cache-Control"), "no Authorization header → no no-store");
    }

    @Test
    void explicitCacheControlIsRespected() {
        // Mirrors getMedia(), which sets its own immutable Cache-Control; the filter must not clobber it.
        MultivaluedMap<String, Object> headers =
                runFilter(AUTHED_METHOD, "Bearer realtoken", "public, max-age=31536000, immutable");

        assertEquals("public, max-age=31536000, immutable", headers.getFirst("Cache-Control"));
    }

    // --- helpers ---

    private MultivaluedMap<String, Object> runFilter(Method resourceMethod, String authHeader, String presetCacheControl) {
        MultivaluedMap<String, Object> responseHeaders = new MultivaluedHashMap<>();
        if (presetCacheControl != null) {
            responseHeaders.putSingle("Cache-Control", presetCacheControl);
        }

        CacheControlResponseFilter filter = new CacheControlResponseFilter();
        filter.resourceInfo = resourceInfo(resourceMethod, PostResource.class);

        try {
            filter.filter(requestContext(authHeader), responseContext(responseHeaders));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return responseHeaders;
    }

    private static Method method(String name, Class<?>... params) {
        try {
            return PostResource.class.getDeclaredMethod(name, params);
        } catch (NoSuchMethodException e) {
            throw new IllegalStateException(e);
        }
    }

    private static ContainerRequestContext requestContext(String authHeader) {
        InvocationHandler h = (proxy, m, args) -> {
            if ("getHeaderString".equals(m.getName()) && "Authorization".equals(args[0])) {
                return authHeader;
            }
            return defaultReturn(m);
        };
        return (ContainerRequestContext) Proxy.newProxyInstance(
                CacheControlResponseFilterTest.class.getClassLoader(),
                new Class<?>[]{ContainerRequestContext.class}, h);
    }

    private static ContainerResponseContext responseContext(MultivaluedMap<String, Object> headers) {
        InvocationHandler h = (proxy, m, args) -> {
            if ("getHeaders".equals(m.getName())) {
                return headers;
            }
            return defaultReturn(m);
        };
        return (ContainerResponseContext) Proxy.newProxyInstance(
                CacheControlResponseFilterTest.class.getClassLoader(),
                new Class<?>[]{ContainerResponseContext.class}, h);
    }

    private static ResourceInfo resourceInfo(Method resourceMethod, Class<?> resourceClass) {
        InvocationHandler h = (proxy, m, args) -> switch (m.getName()) {
            case "getResourceMethod" -> resourceMethod;
            case "getResourceClass" -> resourceClass;
            default -> defaultReturn(m);
        };
        return (ResourceInfo) Proxy.newProxyInstance(
                CacheControlResponseFilterTest.class.getClassLoader(),
                new Class<?>[]{ResourceInfo.class}, h);
    }

    private static Object defaultReturn(Method m) {
        Class<?> r = m.getReturnType();
        if (r == boolean.class) return false;
        if (r == int.class || r == long.class) return 0;
        if (List.class.isAssignableFrom(r)) return List.of();
        return null;
    }
}
