package com.groupys.service;

import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.io.InputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;

@ApplicationScoped
public class StorageService {

    private static final String POSTS_BUCKET = "posts";
    private static final String POSTS_MEDIA_PREFIX = "/api/posts/media/";
    private static final DateTimeFormatter YEAR_FORMAT = DateTimeFormatter.ofPattern("yyyy").withZone(ZoneOffset.UTC);
    private static final DateTimeFormatter MONTH_FORMAT = DateTimeFormatter.ofPattern("MM").withZone(ZoneOffset.UTC);

    @Inject
    MinioClient minioClient;

    public String upload(String fileName, String contentType, InputStream data, long size) {
        return uploadInternal(POSTS_BUCKET, null, fileName, contentType, data, size);
    }

    public String uploadPostMedia(UUID userId, String fileName, String contentType, InputStream data, long size) {
        if (userId == null) {
            return upload(fileName, contentType, data, size);
        }
        return uploadInternal(POSTS_BUCKET, buildPostObjectKey(userId, contentType, fileName), fileName, contentType, data, size);
    }

    public String uploadToBucket(String bucket, String fileName, String contentType, InputStream data, long size) {
        String objectKey = UUID.randomUUID() + "-" + sanitizeFileName(fileName);
        putObject(bucket, objectKey, contentType, data, size);
        return objectKey;
    }

    public String uploadBanner(UUID userId, String fileName, String contentType, InputStream data, long size) {
        String objectKey = buildBannerObjectKey(userId, fileName);
        putObject("banners", objectKey, contentType, data, size);
        return objectKey;
    }

    private String buildBannerObjectKey(UUID userId, String fileName) {
        String sanitized = sanitizeFileName(fileName);
        return "%s/%s-%s".formatted(userId, UUID.randomUUID(), sanitized);
    }

    public void putObject(String bucket, String objectKey, String contentType, InputStream data, long size) {
        try {
            ensureBucketExists(bucket);
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectKey)
                            .stream(data, size, -1)
                            .contentType(contentType)
                            .build());
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload object to bucket " + bucket, e);
        }
    }

    public InputStream getObject(String bucket, String objectKey) {
        try {
            return minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectKey)
                            .build());
        } catch (Exception e) {
            throw new RuntimeException("Failed to read object from bucket " + bucket, e);
        }
    }

    public void delete(String mediaUrl) {
        if (mediaUrl == null || mediaUrl.isBlank()) return;
        try {
            String key = extractObjectKey(mediaUrl);
            if (key == null || key.isBlank()) {
                return;
            }
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(POSTS_BUCKET)
                            .object(key)
                            .build());
        } catch (Exception e) {
            // Log but don't fail the delete operation
            System.err.println("Failed to delete media from storage: " + e.getMessage());
        }
    }

    public String extractObjectKey(String mediaUrl) {
        String normalized = mediaUrl.trim();
        int prefixAt = normalized.indexOf(POSTS_MEDIA_PREFIX);
        String key;
        if (prefixAt >= 0) {
            key = normalized.substring(prefixAt + POSTS_MEDIA_PREFIX.length());
        } else if (normalized.startsWith("/")) {
            key = normalized.substring(1);
        } else {
            key = normalized;
        }
        int queryIndex = key.indexOf('?');
        if (queryIndex >= 0) {
            key = key.substring(0, queryIndex);
        }
        return URLDecoder.decode(key, StandardCharsets.UTF_8);
    }

    private String uploadInternal(String bucket,
                                  String objectKeyOverride,
                                  String fileName,
                                  String contentType,
                                  InputStream data,
                                  long size) {
        try {
            ensureBucketExists(bucket);
            String key = objectKeyOverride != null
                    ? objectKeyOverride
                    : UUID.randomUUID() + "-" + sanitizeFileName(fileName);
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(key)
                            .stream(data, size, -1)
                            .contentType(contentType)
                            .build());
            return POSTS_MEDIA_PREFIX + key;
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload file", e);
        }
    }

    private void ensureBucketExists(String bucket) throws Exception {
        boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
        if (!exists) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
        }
    }

    private String buildPostObjectKey(UUID userId, String contentType, String fileName) {
        Instant now = Instant.now();
        String category = mediaCategory(contentType);
        String sanitized = sanitizeFileName(fileName);
        String year = YEAR_FORMAT.format(now);
        String month = MONTH_FORMAT.format(now);
        return "%s/%s/%s/%s/%s-%s".formatted(userId, category, year, month, UUID.randomUUID(), sanitized);
    }

    private String mediaCategory(String contentType) {
        if (contentType == null) {
            return "files";
        }
        String normalized = contentType.toLowerCase(Locale.ROOT);
        if (normalized.startsWith("image/")) {
            return "images";
        }
        if (normalized.startsWith("video/")) {
            return "videos";
        }
        return "files";
    }

    private String sanitizeFileName(String fileName) {
        String source = fileName == null || fileName.isBlank() ? "file" : fileName;
        String sanitized = source.replaceAll("[^a-zA-Z0-9._-]", "-");
        sanitized = sanitized.replaceAll("-{2,}", "-");
        if (sanitized.startsWith(".")) {
            sanitized = "file" + sanitized;
        }
        return sanitized.isBlank() ? "file" : sanitized;
    }
}
