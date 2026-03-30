package com.groupys.config;

import com.groupys.service.RedisSupport;
import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.Readiness;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@Readiness
@ApplicationScoped
public class RedisHealthCheck implements HealthCheck {

    @Inject
    PerformanceFeatureFlags flags;

    @Inject
    RedisSupport redisSupport;

    @Override
    public HealthCheckResponse call() {
        if (!flags.redisEnabled()) {
            return HealthCheckResponse.named("redis").up()
                    .withData("enabled", false)
                    .build();
        }
        boolean ok = redisSupport.ping();
        if (ok) {
            return HealthCheckResponse.named("redis").up()
                    .withData("enabled", true)
                    .withData("redisAvailable", true)
                    .build();
        }
        if (flags.redisReadinessStrictEnabled()) {
            return HealthCheckResponse.named("redis").down()
                    .withData("enabled", true)
                    .withData("redisAvailable", false)
                    .withData("strict", true)
                    .build();
        }
        return HealthCheckResponse.named("redis").up()
                .withData("enabled", true)
                .withData("redisAvailable", false)
                .withData("degraded", true)
                .withData("strict", false)
                .build();
    }
}
