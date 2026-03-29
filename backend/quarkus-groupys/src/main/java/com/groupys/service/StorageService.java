package com.groupys.service;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.io.InputStream;
import java.util.UUID;

@ApplicationScoped
public class StorageService {

    private static final String BUCKET = "posts";

    @Inject
    MinioClient minioClient;

    public String upload(String fileName, String contentType, InputStream data, long size) {
        try {
            boolean exists = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(BUCKET).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(BUCKET).build());
            }

            String key = UUID.randomUUID() + "-" + fileName;

            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(BUCKET)
                            .object(key)
                            .stream(data, size, -1)
                            .contentType(contentType)
                            .build());

            return "/api/posts/media/" + key;
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload file", e);
        }
    }

    public String uploadToBucket(String bucket, String fileName, String contentType, InputStream data, long size) {
        try {
            boolean exists = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
            }
            String key = UUID.randomUUID() + "-" + fileName;
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(key)
                            .stream(data, size, -1)
                            .contentType(contentType)
                            .build());
            return key;
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload file to bucket " + bucket, e);
        }
    }

    public void delete(String mediaUrl) {
        if (mediaUrl == null || mediaUrl.isBlank()) return;
        try {
            // mediaUrl is like "/api/posts/media/<key>"
            String key = mediaUrl.substring(mediaUrl.lastIndexOf('/') + 1);
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(BUCKET)
                            .object(key)
                            .build());
        } catch (Exception e) {
            // Log but don't fail the delete operation
            System.err.println("Failed to delete media from storage: " + e.getMessage());
        }
    }
}
