package com.groupys.repository;

import com.groupys.model.Album;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class AlbumRepository implements PanacheRepositoryBase<Album, Long> {
}
