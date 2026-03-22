package com.groupys.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class PostMedia {

    @Column(name = "url", nullable = false)
    public String url;

    @Column(name = "type", nullable = false)
    public String type;

    public PostMedia() {
    }

    public PostMedia(String url, String type) {
        this.url = url;
        this.type = type;
    }
}
