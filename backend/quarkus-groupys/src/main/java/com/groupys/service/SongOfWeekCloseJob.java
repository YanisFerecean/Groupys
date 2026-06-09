package com.groupys.service;

import io.quarkus.logging.Log;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/** Closes expired weekly polls and pins their winner recap (ticket 6.4). */
@ApplicationScoped
public class SongOfWeekCloseJob {

    @Inject
    SongOfWeekService songOfWeekService;

    @Scheduled(every = "{song-of-week.close.every:1h}", delayed = "{song-of-week.close.delay:30s}")
    void closeExpired() {
        int closed = songOfWeekService.closeExpiredPolls();
        if (closed > 0) {
            Log.infof("Closed and pinned %d Song of the Week poll(s)", closed);
        }
    }
}
