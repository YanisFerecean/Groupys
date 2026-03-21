package com.groupys.repository;

import com.groupys.model.Artist;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class ArtistRepository implements PanacheRepositoryBase<Artist, Long> {
}
