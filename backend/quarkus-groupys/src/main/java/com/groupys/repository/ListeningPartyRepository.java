package com.groupys.repository;

import com.groupys.model.ListeningParty;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ListeningPartyRepository implements PanacheRepositoryBase<ListeningParty, UUID> {

    public ListeningParty findCurrent(UUID conversationId) {
        return find("""
                conversation.id = ?1
                and (status = 'SCHEDULED' or (status = 'STARTED' and startAt >= ?2))
                order by startAt desc
                """, conversationId, Instant.now().minusSeconds(3600)).firstResult();
    }

    public List<ListeningParty> findDue(Instant now) {
        return find("status = 'SCHEDULED' and startAt <= ?1 order by startAt", now).list();
    }
}
