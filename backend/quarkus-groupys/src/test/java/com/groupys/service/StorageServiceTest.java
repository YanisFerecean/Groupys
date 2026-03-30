package com.groupys.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class StorageServiceTest {

    @Test
    void extractObjectKeySupportsLegacyFlatUrl() {
        StorageService service = new StorageService();
        String key = service.extractObjectKey("/api/posts/media/1234-file.png");
        assertEquals("1234-file.png", key);
    }

    @Test
    void extractObjectKeySupportsNestedPath() {
        StorageService service = new StorageService();
        String key = service.extractObjectKey("/api/posts/media/8f6d/images/2026/03/abc-file.png");
        assertEquals("8f6d/images/2026/03/abc-file.png", key);
    }

    @Test
    void extractObjectKeySupportsAbsoluteUrlAndQuery() {
        StorageService service = new StorageService();
        String key = service.extractObjectKey("https://example.com/api/posts/media/u1/files/2026/03/file.mp3?x=1");
        assertEquals("u1/files/2026/03/file.mp3", key);
    }
}
