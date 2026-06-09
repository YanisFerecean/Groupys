package com.groupys.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/** A catalog track appended to a collaborative conversation playlist (ticket 6.1). */
@Entity
@Table(name = "collab_playlist_tracks", uniqueConstraints = {
        @UniqueConstraint(name = "uk_collab_playlist_track", columnNames = {"playlist_id", "track_key"})
}, indexes = {
        @Index(name = "idx_collab_playlist_track_order", columnList = "playlist_id, position")
})
public class CollabPlaylistTrack {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "playlist_id", nullable = false)
    public CollabPlaylist playlist;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "added_by", nullable = false)
    public User addedBy;

    @Column(name = "track_key", nullable = false, length = 255)
    public String trackKey;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "track_payload", nullable = false, columnDefinition = "jsonb")
    public String trackPayload;

    @Column(name = "position", nullable = false)
    public int position;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
