package com.groupys.repository;

import com.groupys.model.CollabPlaylistTrack;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class CollabPlaylistTrackRepository implements PanacheRepositoryBase<CollabPlaylistTrack, UUID> {

    public CollabPlaylistTrack findOne(UUID playlistId, String trackKey) {
        return find("playlist.id = ?1 and trackKey = ?2", playlistId, trackKey).firstResult();
    }

    public List<CollabPlaylistTrack> findByPlaylist(UUID playlistId) {
        return find("playlist.id = ?1 order by position, createdAt", playlistId).list();
    }

    public int nextPosition(UUID playlistId) {
        return (int) count("playlist.id = ?1", playlistId);
    }
}
