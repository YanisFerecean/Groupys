package com.groupys.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "communities")
public class Community {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(nullable = false, unique = true)
    public String name;

    @Column(columnDefinition = "TEXT")
    public String description;

    public String genre;

    public String country;

    @Column(name = "banner_url")
    public String bannerUrl;

    @Column(name = "icon_type")
    public String iconType; // "IMAGE" or "EMOJI"

    @Column(name = "icon_emoji")
    public String iconEmoji;

    @Column(name = "icon_url")
    public String iconUrl;

    @Column(name = "image_url") // legacy, kept for compatibility
    public String imageUrl;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "community_tags", joinColumns = @JoinColumn(name = "community_id"))
    @Column(name = "tag")
    public List<String> tags = new ArrayList<>();

    @Column(name = "member_count", nullable = false)
    public int memberCount = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "artist_id")
    public Artist artist;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    public User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt;

    @PrePersist
    void onPersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
