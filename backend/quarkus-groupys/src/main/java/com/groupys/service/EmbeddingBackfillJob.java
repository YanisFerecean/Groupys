package com.groupys.service;

import com.groupys.config.PerformanceFeatureFlags;
import com.groupys.repository.UserRepository;
import io.quarkus.logging.Log;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.UUID;

@ApplicationScoped
public class EmbeddingBackfillJob {

    @Inject
    PerformanceFeatureFlags flags;

    @Inject
    UserRepository userRepository;

    @Inject
    TasteEmbeddingService tasteEmbeddingService;

    @Scheduled(every = "{embedding.backfill.every:20m}", delayed = "{embedding.backfill.initial-delay:120s}")
    void backfill() {
        if (!flags.vectorReadEnabled()) {
            return;
        }
        for (UUID userId : userRepository.listActiveDiscoveryUserIds()) {
            try {
                if (!tasteEmbeddingService.vectorReadyForUser(userId)) {
                    tasteEmbeddingService.refreshUserEmbedding(userId);
                }
            } catch (Exception e) {
                Log.debugf(e, "Embedding backfill failed for user %s", userId);
            }
        }
    }
}
