package com.groupys.repository;

import com.groupys.model.HotTake;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class HotTakeRepository implements PanacheRepositoryBase<HotTake, UUID> {

    public Optional<HotTake> findCurrent() {
        return find("ORDER BY createdAt DESC").firstResultOptional();
    }
}
