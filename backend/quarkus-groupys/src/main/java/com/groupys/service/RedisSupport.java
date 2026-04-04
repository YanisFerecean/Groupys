package com.groupys.service;

import com.groupys.config.PerformanceFeatureFlags;
import io.quarkus.logging.Log;
import io.vertx.mutiny.redis.client.RedisAPI;
import io.vertx.mutiny.redis.client.Response;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import io.smallrye.mutiny.Uni;

import java.time.Duration;
import java.util.Optional;
import java.util.function.Function;

@ApplicationScoped
public class RedisSupport {

    @Inject
    Instance<RedisAPI> redisApiInstance;

    @Inject
    PerformanceFeatureFlags flags;

    public boolean enabled() {
        return flags.redisEnabled() && redisApiInstance.isResolvable();
    }

    public boolean ping() {
        if (!enabled()) {
            return false;
        }
        try {
            Response response = redisApi().ping(java.util.List.of())
                    .await().atMost(Duration.ofSeconds(1));
            return response != null;
        } catch (Exception e) {
            Log.debug("Redis ping failed", e);
            return false;
        }
    }

    public Optional<Response> run(Function<RedisAPI, Uni<Response>> operation) {
        if (!enabled()) {
            return Optional.empty();
        }
        try {
            return Optional.ofNullable(operation.apply(redisApi())
                    .await().atMost(Duration.ofSeconds(2)));
        } catch (Exception e) {
            Log.debug("Redis operation failed", e);
            return Optional.empty();
        }
    }

    private RedisAPI redisApi() {
        return redisApiInstance.get();
    }
}
