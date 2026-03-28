package com.groupys.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "tracks", indexes = {
        @jakarta.persistence.Index(name = "idx_tracks_artist", columnList = "artist_id"),
        @jakarta.persistence.Index(name = "idx_tracks_album", columnList = "album_id"),
        @jakarta.persistence.Index(name = "idx_tracks_spotify_id", columnList = "spotify_id")
})
public class Track {

    @Id
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(name = "spotify_id", length = 64, unique = true)
    private String spotifyId;

    @Column(name = "external_isrc", length = 32)
    private String externalIsrc;

    private String preview;

    private Integer duration;

    @Column(name = "track_rank")
    private Integer rank;

    @Column(name = "popularity_score")
    private Double popularityScore;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "artist_id")
    private Artist artist;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "album_id")
    private Album album;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSpotifyId() {
        return spotifyId;
    }

    public void setSpotifyId(String spotifyId) {
        this.spotifyId = spotifyId;
    }

    public String getExternalIsrc() {
        return externalIsrc;
    }

    public void setExternalIsrc(String externalIsrc) {
        this.externalIsrc = externalIsrc;
    }

    public String getPreview() {
        return preview;
    }

    public void setPreview(String preview) {
        this.preview = preview;
    }

    public Integer getDuration() {
        return duration;
    }

    public void setDuration(Integer duration) {
        this.duration = duration;
    }

    public Integer getRank() {
        return rank;
    }

    public void setRank(Integer rank) {
        this.rank = rank;
    }

    public Double getPopularityScore() {
        return popularityScore;
    }

    public void setPopularityScore(Double popularityScore) {
        this.popularityScore = popularityScore;
    }

    public Artist getArtist() {
        return artist;
    }

    public void setArtist(Artist artist) {
        this.artist = artist;
    }

    public Album getAlbum() {
        return album;
    }

    public void setAlbum(Album album) {
        this.album = album;
    }
}
