package com.groupys.config;

import com.groupys.service.RedisSupport;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RedisHealthCheckTest {

    @Test
    void redisDownIsReportedAsUpWhenStrictReadinessIsDisabled() {
        RedisHealthCheck check = new RedisHealthCheck();
        check.flags = new StubFlags(true, false);
        check.redisSupport = new StubRedisSupport(false);

        HealthCheckResponse response = check.call();

        assertEquals(HealthCheckResponse.Status.UP, response.getStatus());
        Map<String, Object> data = response.getData().orElse(Map.of());
        assertEquals(Boolean.TRUE, data.get("degraded"));
        assertEquals(Boolean.FALSE, data.get("strict"));
    }

    @Test
    void redisDownIsReportedAsDownWhenStrictReadinessIsEnabled() {
        RedisHealthCheck check = new RedisHealthCheck();
        check.flags = new StubFlags(true, true);
        check.redisSupport = new StubRedisSupport(false);

        HealthCheckResponse response = check.call();

        assertEquals(HealthCheckResponse.Status.DOWN, response.getStatus());
        Map<String, Object> data = response.getData().orElse(Map.of());
        assertEquals(Boolean.TRUE, data.get("strict"));
        assertEquals(Boolean.FALSE, data.get("redisAvailable"));
    }

    private static final class StubFlags extends PerformanceFeatureFlags {
        private final boolean redisEnabled;
        private final boolean strictReadinessEnabled;

        private StubFlags(boolean redisEnabled, boolean strictReadinessEnabled) {
            this.redisEnabled = redisEnabled;
            this.strictReadinessEnabled = strictReadinessEnabled;
        }

        @Override
        public boolean redisEnabled() {
            return redisEnabled;
        }

        @Override
        public boolean redisReadinessStrictEnabled() {
            return strictReadinessEnabled;
        }
    }

    private static final class StubRedisSupport extends RedisSupport {
        private final boolean pingResult;

        private StubRedisSupport(boolean pingResult) {
            this.pingResult = pingResult;
        }

        @Override
        public boolean ping() {
            return pingResult;
        }
    }
}
