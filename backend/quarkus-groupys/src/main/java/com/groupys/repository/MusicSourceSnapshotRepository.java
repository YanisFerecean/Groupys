package com.groupys.repository;

import com.groupys.model.MusicSourceSnapshot;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class MusicSourceSnapshotRepository implements PanacheRepositoryBase<MusicSourceSnapshot, UUID> {

    public Optional<MusicSourceSnapshot> findLatest(UUID userId, String source, String snapshotType) {
        return find("user.id = ?1 and source = ?2 and snapshotType = ?3 order by fetchedAt desc",
                userId, source, snapshotType).firstResultOptional();
    }

    public List<MusicSourceSnapshot> findByUser(UUID userId) {
        return find("user.id = ?1 order by fetchedAt desc", userId).list();
    }
}
