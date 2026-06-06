package com.groupys.repository;

import com.groupys.model.Report;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ReportRepository implements PanacheRepositoryBase<Report, UUID> {

    /** Reports for admin review, newest first; optionally filtered by status. */
    public List<Report> findForReview(String status, int page, int size) {
        if (status == null || status.isBlank()) {
            return findAll(Sort.descending("createdAt")).page(page, size).list();
        }
        return find("status = ?1", Sort.descending("createdAt"), status.trim().toUpperCase())
                .page(page, size).list();
    }
}
