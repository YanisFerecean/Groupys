package com.groupys.model;

import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "posts", indexes = {
    @Index(name = "idx_posts_community_created", columnList = "community_id, created_at DESC"),
    @Index(name = "idx_posts_author_created", columnList = "author_id, created_at DESC")
})
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(columnDefinition = "TEXT")
    public String title;

    @Column(columnDefinition = "TEXT")
    public String content;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
        name = "post_media",
        joinColumns = @JoinColumn(name = "post_id"),
        indexes = @Index(name = "idx_post_media_post_id", columnList = "post_id")
    )
    @OrderColumn(name = "sort_order")
    @BatchSize(size = 20)
    public List<PostMedia> media = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "community_id", nullable = false)
    public Community community;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    public User author;

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt;

    @PrePersist
    void onPersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
