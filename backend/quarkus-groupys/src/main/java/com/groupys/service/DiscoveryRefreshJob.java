package com.groupys.service;

import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class DiscoveryRefreshJob {

    @Inject
    DiscoveryService discoveryService;

    @Scheduled(every = "{discovery.refresh.every:30m}", delayed = "{discovery.refresh.initial-delay:60s}")
    void refresh() {
        discoveryService.refreshAllActiveUsers();
    }
}
