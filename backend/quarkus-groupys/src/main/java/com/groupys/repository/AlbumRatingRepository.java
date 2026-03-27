package com.groupys.repository;

import com.groupys.model.AlbumRating;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class AlbumRatingRepository implements PanacheRepositoryBase<AlbumRating, UUID> {

    public List<AlbumRating> findByAlbumId(Long albumId) {
        return find("albumId", io.quarkus.panache.common.Sort.descending("createdAt"), albumId).list();
    }

    public List<AlbumRating> findByUserId(UUID userId) {
        return find("user.id", io.quarkus.panache.common.Sort.descending("updatedAt"), userId).list();
    }

    public Optional<AlbumRating> findByUserAndAlbum(UUID userId, Long albumId) {
        return find("user.id = ?1 and albumId = ?2", userId, albumId).firstResultOptional();
    }
}
