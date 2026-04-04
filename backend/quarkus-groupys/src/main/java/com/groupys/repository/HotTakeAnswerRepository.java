package com.groupys.repository;

import com.groupys.model.HotTakeAnswer;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class HotTakeAnswerRepository implements PanacheRepositoryBase<HotTakeAnswer, UUID> {

    public Optional<HotTakeAnswer> findByHotTakeAndUser(UUID hotTakeId, UUID userId) {
        return find("hotTake.id = ?1 and user.id = ?2", hotTakeId, userId).firstResultOptional();
    }

    public List<HotTakeAnswer> findByHotTakeAndUsers(UUID hotTakeId, List<UUID> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return List.of();
        }
        return list("hotTake.id = ?1 and user.id in ?2 and showOnWidget = true", hotTakeId, userIds);
    }
}
