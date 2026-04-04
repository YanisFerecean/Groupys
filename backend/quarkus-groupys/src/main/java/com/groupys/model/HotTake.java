package com.groupys.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "hot_takes")
public class HotTake {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(nullable = false, columnDefinition = "TEXT")
    public String question;

    @Column(nullable = false, length = 20)
    public String weekLabel;

    @Column(length = 20)
    public String answerType = "ARTIST"; // FREETEXT | ARTIST | ALBUM | SONG | COMMUNITY | USER

    @Column(nullable = false)
    public Instant createdAt = Instant.now();
}
