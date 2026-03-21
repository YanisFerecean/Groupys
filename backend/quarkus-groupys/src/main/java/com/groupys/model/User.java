package com.groupys.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "clerk_id", unique = true)
    public String clerkId;

    @Column(nullable = false, unique = true)
    public String username;

    @Column(name = "display_name")
    public String displayName;

    public String bio;

    public String country;

    @Column(name = "banner_url")
    public String bannerUrl;

    @Column(name = "accent_color")
    public String accentColor;

    @Column(name = "name_color")
    public String nameColor;

    @Column(name = "profile_image")
    public String profileImage;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    public String widgets;

    @Column(name = "date_joined", nullable = false, updatable = false)
    public Instant dateJoined;

    @PrePersist
    void onPersist() {
        if (dateJoined == null) {
            dateJoined = Instant.now();
        }
    }
}
