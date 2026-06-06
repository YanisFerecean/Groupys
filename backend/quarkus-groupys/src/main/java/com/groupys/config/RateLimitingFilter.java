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
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Rate limiting filter using Redis for distributed rate limiting.
 * Implements a token bucket algorithm with configurable limits.
 *
 * <p>If Redis is unavailable the filter falls back to a per-instance in-memory
 * fixed-window counter instead of failing fully open. The fallback is best-effort
 * (not shared across instances) but still throttles abusive clients while Redis
 * recovers.
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

    // In-memory fallback (used only when Redis is down). Cap the map so a flood of
    // distinct clients can't exhaust heap; the cap is generous relative to expected fan-out.
    private static final int FALLBACK_MAX_KEYS = 100_000;
    private final ConcurrentHashMap<String, FixedWindow> fallbackCounters = new ConcurrentHashMap<>();
    // Throttle the "Redis unavailable" log so a sustained outage doesn't spam the logs.
    private final AtomicLong lastFallbackLogEpochSec = new AtomicLong(0);

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
                logFallbackOnce();
                applyInMemoryLimit(requestContext, key, limit, windowSeconds, method, path, clientId);
                return;
            }

            // Token bucket algorithm using Redis.
            // get() returns null Response when the key is absent (first request in window).
            io.vertx.redis.client.Response current = redisClient.get(key);
            String currentCountStr = current != null ? current.toString() : null;
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
            // A Redis blip must not take down the whole API. Degrade to the in-memory
            // limiter instead of failing fully open. Surfaced at WARN (throttled) so
            // operators can see when distributed rate limiting is degraded.
            logFallbackOnce();
            LOG.warnf(e, "Redis rate limiting failed for %s; using in-memory fallback", path);
            try {
                applyInMemoryLimit(requestContext, key, limit, windowSeconds, method, path, clientId);
            } catch (Exception fallbackError) {
                // Last resort: never let the limiter itself break the request.
                LOG.warnf(fallbackError, "In-memory rate limit fallback failed for %s", path);
            }
        }
    }

    /**
     * Per-instance fixed-window rate limit used when Redis is unavailable. Not shared
     * across instances, so the effective global limit is (limit * instanceCount) during
     * an outage — an acceptable degraded mode that still blocks single-client floods.
     */
    private void applyInMemoryLimit(ContainerRequestContext requestContext, String key, int limit,
                                    int windowSeconds, String method, String path, String clientId) {
        long nowSec = System.currentTimeMillis() / 1000L;
        long windowId = nowSec / windowSeconds;

        // Guard against unbounded growth if a huge set of distinct clients appears.
        if (fallbackCounters.size() > FALLBACK_MAX_KEYS) {
            fallbackCounters.clear();
        }

        FixedWindow window = fallbackCounters.compute(key, (k, existing) -> {
            if (existing == null || existing.windowId != windowId) {
                return new FixedWindow(windowId);
            }
            return existing;
        });

        int used = window.count.incrementAndGet();
        if (used > limit) {
            LOG.warnf("Rate limit exceeded (in-memory) for client %s on %s %s", clientId, method, path);
            requestContext.abortWith(
                Response.status(Response.Status.TOO_MANY_REQUESTS)
                    .entity("{\"error\":\"Rate limit exceeded. Please try again later.\"}")
                    .header("Content-Type", "application/json")
                    .header("Retry-After", String.valueOf(windowSeconds))
                    .build()
            );
            return;
        }

        requestContext.getHeaders().add("X-RateLimit-Limit", String.valueOf(limit));
        requestContext.getHeaders().add("X-RateLimit-Remaining", String.valueOf(Math.max(0, limit - used)));
    }

    /** Logs the Redis-unavailable warning at most once per minute to avoid log spam during an outage. */
    private void logFallbackOnce() {
        long nowSec = System.currentTimeMillis() / 1000L;
        long last = lastFallbackLogEpochSec.get();
        if (nowSec - last >= 60 && lastFallbackLogEpochSec.compareAndSet(last, nowSec)) {
            LOG.warn("Redis unavailable; rate limiting degraded to per-instance in-memory fallback");
        }
    }

    /** Fixed-window counter: a window id (epochSecond / windowSeconds) and a request count. */
    private static final class FixedWindow {
        final long windowId;
        final AtomicInteger count = new AtomicInteger(0);

        FixedWindow(long windowId) {
            this.windowId = windowId;
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
               path.startsWith("ws/") ||
               path.contains("/ws/") ||
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
