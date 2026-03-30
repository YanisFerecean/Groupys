package com.groupys.service;

import com.groupys.config.PerformanceFeatureFlags;
import com.groupys.model.MusicSourceSnapshot;
import com.groupys.repository.MusicSourceSnapshotRepository;
import io.quarkus.logging.Log;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;

@ApplicationScoped
public class MusicSnapshotBackfillJob {

    private static final DateTimeFormatter YEAR_FORMAT = DateTimeFormatter.ofPattern("yyyy").withZone(ZoneOffset.UTC);
    private static final DateTimeFormatter MONTH_FORMAT = DateTimeFormatter.ofPattern("MM").withZone(ZoneOffset.UTC);

    @Inject
    PerformanceFeatureFlags flags;

    @Inject
    MusicSourceSnapshotRepository musicSourceSnapshotRepository;

    @Inject
    StorageService storageService;

    @Scheduled(every = "{snapshot.backfill.every:45m}", delayed = "{snapshot.backfill.initial-delay:150s}")
    @Transactional
    void backfill() {
        if (!flags.snapshotBlobWriteEnabled()) {
            return;
        }
        for (MusicSourceSnapshot snapshot : musicSourceSnapshotRepository.findPendingBlobBackfill(100)) {
            try {
                if (snapshot.payloadJson == null || snapshot.user == null || snapshot.user.id == null) {
                    continue;
                }
                byte[] bytes = snapshot.payloadJson.getBytes(StandardCharsets.UTF_8);
                String objectKey = buildObjectKey(snapshot.user.id, snapshot.source, snapshot.snapshotType);
                storageService.putObject(
                        flags.snapshotBucket(),
                        objectKey,
                        "application/json",
                        new ByteArrayInputStream(bytes),
                        bytes.length
                );
                snapshot.objectKey = objectKey;
                snapshot.payloadSizeBytes = (long) bytes.length;
                snapshot.checksum = sha256Hex(bytes);
                if (!flags.snapshotPayloadJsonWriteEnabled()) {
                    snapshot.payloadJson = null;
                }
            } catch (Exception e) {
                Log.debugf(e, "Music snapshot backfill failed for snapshot %s", snapshot.id);
            }
        }
    }

    private String buildObjectKey(UUID userId, String source, String snapshotType) {
        Instant now = Instant.now();
        return "%s/%s/%s/%s/%s/%s.json".formatted(
                userId,
                sanitize(source),
                sanitize(snapshotType),
                YEAR_FORMAT.format(now),
                MONTH_FORMAT.format(now),
                UUID.randomUUID()
        );
    }

    private String sanitize(String value) {
        if (value == null || value.isBlank()) {
            return "unknown";
        }
        return value.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9._-]", "-");
    }

    private String sha256Hex(byte[] bytes) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(bytes);
            StringBuilder builder = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                builder.append(String.format(Locale.ROOT, "%02x", b));
            }
            return builder.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Unable to compute SHA-256", e);
        }
    }
}
