package com.groupys.config;

import io.quarkus.logging.Log;
import io.quarkus.runtime.LaunchMode;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.ArrayList;
import java.util.List;

/**
 * Refuses to boot a production runtime that is still wired with insecure dev defaults.
 * Only enforced when LaunchMode is NORMAL (a packaged prod run); dev and test keep their
 * convenient fallbacks.
 */
@ApplicationScoped
public class StartupConfigValidator {

    static final String DEV_ENCRYPTION_KEY =
            "qJ7wNcRfUjXn2r5u8x/A1D3G6K9PcQeThWmZq4t7wOzBhJ8M5N2Q5T8NwO2R4U7Y=";

    @ConfigProperty(name = "encryption.master.key")
    String encryptionKey;

    @ConfigProperty(name = "quarkus.minio.access-key")
    String minioAccessKey;

    @ConfigProperty(name = "quarkus.minio.secret-key")
    String minioSecretKey;

    @ConfigProperty(name = "quarkus.http.cors.origins")
    String corsOrigins;

    @ConfigProperty(name = "music.apple.team-id")
    String appleTeamId;

    @ConfigProperty(name = "music.apple.key-id")
    String appleKeyId;

    @ConfigProperty(name = "music.apple.private-key")
    String applePrivateKey;

    void onStart(@Observes StartupEvent ignored) {
        if (LaunchMode.current() != LaunchMode.NORMAL) {
            return;
        }

        List<String> problems = new ArrayList<>();

        if (DEV_ENCRYPTION_KEY.equals(encryptionKey)) {
            problems.add("ENCRYPTION_MASTER_KEY is unset (using the dev fallback key)");
        }
        if ("minioadmin".equals(minioAccessKey)) {
            problems.add("MINIO_ACCESS_KEY is unset (using the 'minioadmin' default)");
        }
        if ("changeme".equals(minioSecretKey)) {
            problems.add("MINIO_SECRET_KEY is unset (using the 'changeme' default)");
        }
        if (corsOrigins != null && corsOrigins.contains("localhost")) {
            problems.add("APP_CORS_ORIGINS is unset (using localhost dev origins)");
        }
        if (isBlank(appleTeamId) || isBlank(appleKeyId) || isBlank(applePrivateKey)) {
            problems.add("Apple Music credentials (APPLE_TEAM_ID/APPLE_KEY_ID/APPLE_PRIVATE_KEY) are not all set");
        }

        if (!problems.isEmpty()) {
            String message = "Refusing to start in production with insecure configuration:\n  - "
                    + String.join("\n  - ", problems)
                    + "\nSet the corresponding environment variables before deploying.";
            Log.error(message);
            throw new IllegalStateException(message);
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
