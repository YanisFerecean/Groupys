package com.groupys.model;

import jakarta.persistence.*;

@Entity
@Table(name = "countries")
public class Country {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(length = 2, nullable = false, unique = true)
    public String code; // ISO 3166-1 alpha-2

    @Column(nullable = false)
    public String name;
}
