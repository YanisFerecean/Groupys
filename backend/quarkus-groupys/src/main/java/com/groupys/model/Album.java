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

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "albums")
public class Album {

    @Id
    private Long id;

    @Column(nullable = false)
    private String title;

    private String coverSmall;

    private String coverMedium;

    private String coverBig;

    private String coverXl;

    private String releaseDate;

    private String label;

    private Integer duration;

    private Integer nbTracks;

    private Integer fans;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "album_genres", joinColumns = @JoinColumn(name = "album_id"))
    @Column(name = "genre")
    private List<String> genres = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "artist_id")
    private Artist artist;

    @OneToMany(mappedBy = "album", fetch = FetchType.LAZY)
    private List<Track> tracks = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCoverSmall() { return coverSmall; }
    public void setCoverSmall(String coverSmall) { this.coverSmall = coverSmall; }

    public String getCoverMedium() { return coverMedium; }
    public void setCoverMedium(String coverMedium) { this.coverMedium = coverMedium; }

    public String getCoverBig() { return coverBig; }
    public void setCoverBig(String coverBig) { this.coverBig = coverBig; }

    public String getCoverXl() { return coverXl; }
    public void setCoverXl(String coverXl) { this.coverXl = coverXl; }

    public String getReleaseDate() { return releaseDate; }
    public void setReleaseDate(String releaseDate) { this.releaseDate = releaseDate; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public Integer getDuration() { return duration; }
    public void setDuration(Integer duration) { this.duration = duration; }

    public Integer getNbTracks() { return nbTracks; }
    public void setNbTracks(Integer nbTracks) { this.nbTracks = nbTracks; }

    public Integer getFans() { return fans; }
    public void setFans(Integer fans) { this.fans = fans; }

    public List<String> getGenres() { return genres; }
    public void setGenres(List<String> genres) { this.genres = genres; }

    public Artist getArtist() { return artist; }
    public void setArtist(Artist artist) { this.artist = artist; }

    public List<Track> getTracks() { return tracks; }
    public void setTracks(List<Track> tracks) { this.tracks = tracks; }
}
