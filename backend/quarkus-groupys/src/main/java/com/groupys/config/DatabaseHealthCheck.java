package com.groupys.config;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.Readiness;

import javax.sql.DataSource;
import java.sql.Connection;

/**
 * Readiness probe for the PostgreSQL datasource. Without this, /q/health/ready
 * reports UP even when the database is unreachable.
 */
@Readiness
@ApplicationScoped
public class DatabaseHealthCheck implements HealthCheck {

    @Inject
    DataSource dataSource;

    @Override
    public HealthCheckResponse call() {
        try (Connection connection = dataSource.getConnection()) {
            boolean valid = connection.isValid(2);
            return HealthCheckResponse.named("database")
                    .status(valid)
                    .withData("available", valid)
                    .build();
        } catch (Exception e) {
            return HealthCheckResponse.named("database").down()
                    .withData("available", false)
                    .withData("error", e.getClass().getSimpleName())
                    .build();
        }
    }
}
