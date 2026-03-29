package com.groupys.service;

import jakarta.enterprise.context.ApplicationScoped;
import net.coobird.thumbnailator.Thumbnails;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

/**
 * Compresses uploaded media before it reaches MinIO.
 * - Images: resized to max 2048px, re-encoded as JPEG 85%
 * - Videos: scaled to max 1080p, H.264 CRF 28, AAC 128 k (MP4)
 * - Audio:  re-encoded as AAC 128 k (M4A)
 * FFmpeg must be on PATH for video/audio processing.
 */
@ApplicationScoped
public class MediaService {

    private static final int MAX_IMAGE_DIMENSION = 2048;
    private static final float JPEG_QUALITY = 0.85f;

    public record ProcessedMedia(InputStream stream, long size, String contentType) {}

    // ── Images ───────────────────────────────────────────────────────────────

    public ProcessedMedia processImage(InputStream input, String contentType) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Thumbnails.of(input)
                    .size(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION)
                    .keepAspectRatio(true)
                    .outputFormat("JPEG")
                    .outputQuality(JPEG_QUALITY)
                    .toOutputStream(out);
            byte[] bytes = out.toByteArray();
            return new ProcessedMedia(new ByteArrayInputStream(bytes), bytes.length, "image/jpeg");
        } catch (Exception e) {
            throw new RuntimeException("Image processing failed", e);
        }
    }

    // ── Video ─────────────────────────────────────────────────────────────────

    public ProcessedMedia processVideo(Path inputPath) {
        Path outputPath = null;
        try {
            outputPath = Files.createTempFile("vid-out-", ".mp4");
            ProcessBuilder pb = new ProcessBuilder(
                    "ffmpeg", "-y",
                    "-i", inputPath.toString(),
                    "-vf", "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",
                    "-c:v", "libx264", "-crf", "28", "-preset", "fast",
                    "-c:a", "aac", "-b:a", "128k",
                    "-movflags", "+faststart",
                    outputPath.toString()
            );
            pb.redirectErrorStream(true);
            int exitCode = pb.start().waitFor();
            if (exitCode != 0) {
                throw new RuntimeException("FFmpeg video processing failed (exit " + exitCode + ")");
            }
            byte[] bytes = Files.readAllBytes(outputPath);
            return new ProcessedMedia(new ByteArrayInputStream(bytes), bytes.length, "video/mp4");
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Video processing failed", e);
        } finally {
            if (outputPath != null) {
                try { Files.deleteIfExists(outputPath); } catch (Exception ignored) {}
            }
        }
    }

    // ── Audio ─────────────────────────────────────────────────────────────────

    public ProcessedMedia processAudio(Path inputPath) {
        Path outputPath = null;
        try {
            outputPath = Files.createTempFile("aud-out-", ".m4a");
            ProcessBuilder pb = new ProcessBuilder(
                    "ffmpeg", "-y",
                    "-i", inputPath.toString(),
                    "-c:a", "aac", "-b:a", "128k",
                    "-vn",
                    outputPath.toString()
            );
            pb.redirectErrorStream(true);
            int exitCode = pb.start().waitFor();
            if (exitCode != 0) {
                throw new RuntimeException("FFmpeg audio processing failed (exit " + exitCode + ")");
            }
            byte[] bytes = Files.readAllBytes(outputPath);
            return new ProcessedMedia(new ByteArrayInputStream(bytes), bytes.length, "audio/mp4");
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Audio processing failed", e);
        } finally {
            if (outputPath != null) {
                try { Files.deleteIfExists(outputPath); } catch (Exception ignored) {}
            }
        }
    }
}
