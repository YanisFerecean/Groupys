package com.groupys.service;

import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class PgVectorSupport {

    private volatile boolean available;

    public boolean available() {
        return available;
    }

    public void setAvailable(boolean available) {
        this.available = available;
    }
}
