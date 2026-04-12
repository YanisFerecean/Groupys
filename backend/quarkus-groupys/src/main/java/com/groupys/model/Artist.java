package com.groupys.model;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import org.hibernate.annotations.ColumnDefault;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "artists", indexes = {
        @jakarta.persistence.Index(name = "idx_artists_name", columnList = "name"),
        @jakarta.persistence.Index(name = "idx_artists_apple_music_id", columnList = "apple_music_id"),
        @jakarta.persistence.Index(name = "idx_artists_primary_genre", columnList = "primary_genre_id")
})
public class Artist {

    @Id
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "apple_music_id", length = 64, unique = true)
    private String appleMusicId;

    @Column(name = "lastfm_name")
    private String lastfmName;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "artist_images", joinColumns = @JoinColumn(name = "artist_id"))
    @Column(name = "image_url")
    private List<String> images = new ArrayList<>();

    private Long listeners;

    private Long playcount;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "primary_genre_id")
    private Genre primaryGenre;

    @Column(name = "genres_enriched", nullable = false)
    @ColumnDefault("false")
    private boolean genresEnriched;

    @Column(name = "popularity_score")
    private Double popularityScore;

    @OneToMany(mappedBy = "artist", fetch = FetchType.LAZY)
    private List<Album> albums = new ArrayList<>();

    @OneToMany(mappedBy = "artist", fetch = FetchType.LAZY)
    private List<Track> tracks = new ArrayList<>();

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<String> getImages() {
        return images;
    }

    public void setImages(List<String> images) {
        this.images = images;
    }

    public Long getListeners() {
        return listeners;
    }

    public void setListeners(Long listeners) {
        this.listeners = listeners;
    }

    public Long getPlaycount() {
        return playcount;
    }

    public void setPlaycount(Long playcount) {
        this.playcount = playcount;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getAppleMusicId() {
        return appleMusicId;
    }

    public void setAppleMusicId(String appleMusicId) {
        this.appleMusicId = appleMusicId;
    }

    public String getLastfmName() {
        return lastfmName;
    }

    public void setLastfmName(String lastfmName) {
        this.lastfmName = lastfmName;
    }

    public Genre getPrimaryGenre() {
        return primaryGenre;
    }

    public void setPrimaryGenre(Genre primaryGenre) {
        this.primaryGenre = primaryGenre;
    }

    public boolean isGenresEnriched() {
        return genresEnriched;
    }

    public void setGenresEnriched(boolean genresEnriched) {
        this.genresEnriched = genresEnriched;
    }

    public Double getPopularityScore() {
        return popularityScore;
    }

    public void setPopularityScore(Double popularityScore) {
        this.popularityScore = popularityScore;
    }

    public List<Album> getAlbums() {
        return albums;
    }

    public void setAlbums(List<Album> albums) {
        this.albums = albums;
    }

    public List<Track> getTracks() {
        return tracks;
    }

    public void setTracks(List<Track> tracks) {
        this.tracks = tracks;
    }
}
