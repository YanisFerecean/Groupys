package com.groupys.service;

import com.groupys.model.Country;
import com.groupys.repository.CountryRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.List;

@ApplicationScoped
public class CountryService {

    @Inject
    CountryRepository countryRepository;

    public List<Country> search(String q) {
        return countryRepository.search(q);
    }
}
