package com.groupys.service;

import com.groupys.config.PerformanceFeatureFlags;
import com.groupys.model.UserArtistPreference;
import com.groupys.model.UserGenrePreference;
import com.groupys.model.UserTrackPreference;
import com.groupys.repository.UserArtistPreferenceRepository;
import com.groupys.repository.UserGenrePreferenceRepository;
import com.groupys.repository.UserTasteProfileRepository;
import com.groupys.repository.UserTrackPreferenceRepository;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

@ApplicationScoped
public class TasteEmbeddingService {

    private static final String MODEL_NAME = "local-feature-hash-v1";

    @Inject
    PerformanceFeatureFlags flags;

    @Inject
    PgVectorSupport pgVectorSupport;

    @Inject
    UserTasteProfileRepository userTasteProfileRepository;

    @Inject
    UserArtistPreferenceRepository userArtistPreferenceRepository;

    @Inject
    UserGenrePreferenceRepository userGenrePreferenceRepository;

    @Inject
    UserTrackPreferenceRepository userTrackPreferenceRepository;

    @Transactional
    public void refreshUserEmbedding(UUID userId) {
        if (!pgVectorSupport.available()) {
            return;
        }
        if (userTasteProfileRepository.findByUserId(userId).isEmpty()) {
            return;
        }
        try {
            int dimensions = Math.max(8, flags.vectorEmbeddingDimension());
            double[] vector = buildVector(userId, dimensions);
            userTasteProfileRepository.updateEmbedding(userId, toVectorLiteral(vector), MODEL_NAME, Instant.now());
        } catch (Exception e) {
            Log.warnf(e, "Failed to refresh embedding for user %s", userId);
        }
    }

    public boolean vectorReadyForUser(UUID userId) {
        return pgVectorSupport.available() && userTasteProfileRepository.hasEmbedding(userId);
    }

    public List<UUID> findTopKCandidates(UUID userId, int topK) {
        if (!pgVectorSupport.available()) {
            return List.of();
        }
        try {
            return userTasteProfileRepository.findEmbeddingLiteral(userId)
                    .map(embedding -> userTasteProfileRepository.findTopKCandidateUserIds(userId, embedding, Math.max(1, topK)))
                    .orElse(List.of());
        } catch (Exception e) {
            Log.warnf(e, "Vector candidate query failed for user %s", userId);
            return List.of();
        }
    }

    private double[] buildVector(UUID userId, int dimensions) {
        double[] vector = new double[dimensions];

        List<UserArtistPreference> artists = userArtistPreferenceRepository.findByUser(userId);
        for (UserArtistPreference pref : artists) {
            if (pref.artist == null || pref.artist.getId() == null) {
                continue;
            }
            add(vector, "A:" + pref.artist.getId(), safe(pref.normalizedScore) * 1.0d);
        }

        List<UserGenrePreference> genres = userGenrePreferenceRepository.findByUser(userId);
        for (UserGenrePreference pref : genres) {
            if (pref.genre == null || pref.genre.id == null) {
                continue;
            }
            add(vector, "G:" + pref.genre.id, safe(pref.normalizedScore) * 0.8d);
        }

        List<UserTrackPreference> tracks = userTrackPreferenceRepository.findByUser(userId);
        for (UserTrackPreference pref : tracks) {
            if (pref.track == null || pref.track.getId() == null) {
                continue;
            }
            add(vector, "T:" + pref.track.getId(), safe(pref.normalizedScore) * 0.6d);
        }

        normalize(vector);
        return vector;
    }

    private void add(double[] vector, String key, double weight) {
        int index = Math.floorMod(Objects.hash(key), vector.length);
        vector[index] += weight;
    }

    private void normalize(double[] vector) {
        double sumSq = 0d;
        for (double value : vector) {
            sumSq += value * value;
        }
        if (sumSq <= 0d) {
            return;
        }
        double norm = Math.sqrt(sumSq);
        for (int i = 0; i < vector.length; i++) {
            vector[i] /= norm;
        }
    }

    private String toVectorLiteral(double[] vector) {
        StringBuilder builder = new StringBuilder(vector.length * 10);
        builder.append('[');
        for (int i = 0; i < vector.length; i++) {
            if (i > 0) {
                builder.append(',');
            }
            builder.append(String.format(Locale.ROOT, "%.6f", vector[i]));
        }
        builder.append(']');
        return builder.toString();
    }

    private double safe(Double value) {
        return value == null ? 0d : value;
    }
}
