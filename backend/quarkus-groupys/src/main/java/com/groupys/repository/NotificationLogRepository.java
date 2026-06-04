package com.groupys.repository;

import com.groupys.model.NotificationLog;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.UUID;

@ApplicationScoped
public class NotificationLogRepository implements PanacheRepositoryBase<NotificationLog, UUID> {

    public boolean alreadySent(UUID userId, String type, String refKey) {
        return count("userId = ?1 and type = ?2 and refKey = ?3", userId, type, refKey) > 0;
    }

    /** Records a send; returns false if it was already logged (idempotent guard). */
    public boolean record(UUID userId, String type, String refKey) {
        if (alreadySent(userId, type, refKey)) return false;
        NotificationLog log = new NotificationLog();
        log.userId = userId;
        log.type = type;
        log.refKey = refKey;
        persist(log);
        return true;
    }
}
