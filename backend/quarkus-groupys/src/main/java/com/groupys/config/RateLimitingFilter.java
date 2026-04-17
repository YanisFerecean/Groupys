package com.groupys.config;

import io.quarkus.redis.client.RedisClient;
import io.quarkus.redis.client.RedisClientName;
import jakarta.inject.Inject;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;
import org.jboss.logging.Logger;

import java.io.IOException;
import java.time.Duration;

/**
 * Rate limiting filter using Redis for distributed rate limiting.
 * Implements a token bucket algorithm with configurable limits.
 */
@Provider
public class RateLimitingFilter implements ContainerRequestFilter {

    private static final Logger LOG = Logger.getLogger(RateLimitingFilter.class);

    // Rate limits: requests per window
    private static final int DEFAULT_LIMIT = 100;        // 100 requests
    private static final int DEFAULT_WINDOW_SECONDS = 60; // per 60 seconds
    private static final int PUBLIC_ENDPOINT_LIMIT = 30;  // 30 requests per minute for public endpoints

    // Specific endpoint limits
    private static final int UPLOAD_LIMIT = 10;         // 10 uploads per minute
    private static final int LOGIN_LIMIT = 5;           // 5 login attempts per minute

    @Inject
    @RedisClientName("default")
    RedisClient redisClient;

    @Override
    public void filter(ContainerRequestContext requestContext) throws IOException {
        String path = requestContext.getUriInfo().getPath();
        String method = requestContext.getMethod();
        String clientId = getClientIdentifier(requestContext);

        // Skip rate limiting for certain paths
        if (shouldSkipRateLimiting(path)) {
            return;
        }

        int limit = getLimitForPath(path);
        int windowSeconds = DEFAULT_WINDOW_SECONDS;
        String key = "ratelimit:" + clientId + ":" + path.hashCode();

        try {
            // Check if Redis is available
            if (redisClient == null) {
                LOG.debug("Redis not available, skipping rate limiting");
                return;
            }

            // Token bucket algorithm using Redis
            String currentCountStr = redisClient.get(key).toString();
            long currentCount = currentCountStr != null && !currentCountStr.isEmpty()
                ? Long.parseLong(currentCountStr)
                : 0;

            if (currentCount >= limit) {
                LOG.warnf("Rate limit exceeded for client %s on %s %s", clientId, method, path);
                requestContext.abortWith(
                    Response.status(Response.Status.TOO_MANY_REQUESTS)
                        .entity("{\"error\":\"Rate limit exceeded. Please try again later.\"}")
                        .header("Content-Type", "application/json")
                        .header("Retry-After", String.valueOf(windowSeconds))
                        .build()
                );
                return;
            }

            // Increment counter with TTL
            redisClient.incr(key);
            if (currentCount == 0) {
                redisClient.expire(key, String.valueOf(windowSeconds));
            }

            // Add rate limit headers
            requestContext.getHeaders().add("X-RateLimit-Limit", String.valueOf(limit));
            requestContext.getHeaders().add("X-RateLimit-Remaining", String.valueOf(limit - currentCount - 1));

        } catch (Exception e) {
            // Log but don't fail the request if Redis is unavailable
            LOG.debugf("Rate limiting check failed: %s", e.getMessage());
        }
    }

    private String getClientIdentifier(ContainerRequestContext requestContext) {
        // Use JWT subject if available, otherwise use IP + User-Agent hash
        String authHeader = requestContext.getHeaderString("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            // Extract a hash of the token (not the full token for privacy)
            String token = authHeader.substring(7);
            return "user:" + Math.abs(token.hashCode());
        }

        String ip = requestContext.getHeaderString("X-Forwarded-For");
        if (ip == null || ip.isEmpty()) {
            ip = requestContext.getHeaderString("X-Real-IP");
        }
        if (ip == null || ip.isEmpty()) {
            ip = "unknown";
        }

        String userAgent = requestContext.getHeaderString("User-Agent");
        if (userAgent == null) {
            userAgent = "";
        }

        return "ip:" + Math.abs((ip + userAgent).hashCode());
    }

    private boolean shouldSkipRateLimiting(String path) {
        // Skip rate limiting for health checks and static resources
        return path.contains("/health") ||
               path.contains("/q/") ||
               path.endsWith(".js") ||
               path.endsWith(".css") ||
               path.endsWith(".png") ||
               path.endsWith(".jpg");
    }

    private int getLimitForPath(String path) {
        if (path.contains("/media/upload")) {
            return UPLOAD_LIMIT;
        }
        if (path.contains("/auth/") || path.contains("/login")) {
            return LOGIN_LIMIT;
        }
        if (path.contains("/countries")) {
            return PUBLIC_ENDPOINT_LIMIT;
        }
        return DEFAULT_LIMIT;
    }
}
