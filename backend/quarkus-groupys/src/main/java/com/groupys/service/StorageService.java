package com.groupys.service;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
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
}
