package com.groupys.config;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertTrue;

class FlywayMigrationVersionTest {

    private static final Pattern VERSIONED_MIGRATION = Pattern.compile("^V([^_]+)__.+\\.sql$");

    @Test
    void versionedMigrationsHaveUniqueVersions() throws IOException {
        Path migrationDirectory = Path.of("src/main/resources/db/migration");

        Map<String, List<String>> migrationsByVersion;
        try (var files = Files.list(migrationDirectory)) {
            migrationsByVersion = files
                    .map(path -> path.getFileName().toString())
                    .map(VERSIONED_MIGRATION::matcher)
                    .filter(Matcher::matches)
                    .collect(Collectors.groupingBy(
                            matcher -> matcher.group(1),
                            Collectors.mapping(Matcher::group, Collectors.toList())
                    ));
        }

        Map<String, List<String>> duplicates = migrationsByVersion.entrySet().stream()
                .filter(entry -> entry.getValue().size() > 1)
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

        assertTrue(duplicates.isEmpty(), "Duplicate Flyway migration versions: " + duplicates);
    }
}
