package com.groupys.config;

import io.quarkus.security.identity.SecurityIdentity;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.container.ResourceInfo;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.ext.Provider;

import java.lang.reflect.Method;

/**
 * Stops shared/HTTP caches (CDNs, reverse proxies) from storing per-user authenticated
 * responses, which could otherwise serve one user's data to another.
 *
 * <p>For any request carrying an {@code Authorization} header that hits a non-public
 * resource, the response is marked {@code Cache-Control: private, no-store} and
 * {@code Vary: Authorization}. This replaces the previous client-side workaround where
 * the mobile app had to pass a request-side {@code Cache-Control: no-cache} per call.
 *
 * <p>Intentionally left cacheable:
 * <ul>
 *   <li>{@code @PermitAll} endpoints (e.g. {@code /posts/&#123;id&#125;/meta},
 *       {@code /posts/media/&#123;key&#125;}, {@code /posts/author/&#123;id&#125;/count}) — public by design.</li>
 *   <li>Any response that already set its own {@code Cache-Control} (e.g. the
 *       {@code public, max-age=..., immutable} media stream) — its choice is respected.</li>
 *   <li>Anonymous requests (no {@code Authorization} header).</li>
 * </ul>
 */
@Provider
public class CacheControlResponseFilter implements ContainerResponseFilter {

    @Context
    ResourceInfo resourceInfo;

    @Inject
    SecurityIdentity identity;

    @Override
    public void filter(ContainerRequestContext requestContext, ContainerResponseContext responseContext) {
        // Respect an explicit Cache-Control already set by the resource (e.g. immutable media).
        if (responseContext.getHeaders().containsKey(HttpHeaders.CACHE_CONTROL)) {
            return;
        }

        // Public-by-design endpoints stay cacheable, even when called by a logged-in client.
        if (isPublic()) {
            return;
        }

        // Only guard responses produced for an authenticated caller. Prefer the resolved
        // SecurityIdentity (covers any auth scheme, and works when proactive auth is on); fall
        // back to a raw Authorization header so the guard holds even if identity isn't eagerly
        // resolved (e.g. proactive auth disabled).
        if (!isAuthenticated(requestContext)) {
            return;
        }

        responseContext.getHeaders().putSingle(HttpHeaders.CACHE_CONTROL, "private, no-store");
        // Belt-and-suspenders: tell any shared cache the response varies per credential.
        responseContext.getHeaders().add(HttpHeaders.VARY, "Authorization");
    }

    private boolean isAuthenticated(ContainerRequestContext requestContext) {
        if (identity != null && !identity.isAnonymous()) {
            return true;
        }
        String auth = requestContext.getHeaderString(HttpHeaders.AUTHORIZATION);
        return auth != null && !auth.isBlank();
    }

    /** True when the matched resource method (or its class) opts into public access via {@code @PermitAll}. */
    private boolean isPublic() {
        if (resourceInfo == null) {
            return false;
        }
        Method method = resourceInfo.getResourceMethod();
        if (method != null && method.isAnnotationPresent(PermitAll.class)) {
            return true;
        }
        Class<?> clazz = resourceInfo.getResourceClass();
        return clazz != null && clazz.isAnnotationPresent(PermitAll.class);
    }
}
