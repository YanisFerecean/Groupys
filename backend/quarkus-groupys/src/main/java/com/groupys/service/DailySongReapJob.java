package com.groupys.service;

import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/** Periodically removes expired daily songs (ticket 5.2). Lazy read-filtering is the correctness
 * guarantee; this just reclaims rows. */
@ApplicationScoped
public class DailySongReapJob {

    @Inject
    DailySongService dailySongService;

    @Scheduled(every = "{daily-song.reap.every:1h}", delayed = "{daily-song.reap.initial-delay:120s}")
    void reap() {
        dailySongService.reapExpired();
    }
}
