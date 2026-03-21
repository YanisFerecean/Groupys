package com.groupys.repository;

import com.groupys.model.Track;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class TrackRepository implements PanacheRepositoryBase<Track, Long> {
}
