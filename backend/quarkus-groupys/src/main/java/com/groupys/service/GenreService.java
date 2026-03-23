package com.groupys.service;

import com.groupys.model.Genre;
import com.groupys.repository.GenreRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.List;

@ApplicationScoped
public class GenreService {

    @Inject
    GenreRepository genreRepository;

    public List<Genre> search(String q) {
        return genreRepository.search(q);
    }
}
