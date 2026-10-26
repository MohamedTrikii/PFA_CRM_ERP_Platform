package com.erp.cms.repository;

import com.erp.cms.domain.ReferenceCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ReferenceCategoryRepository extends JpaRepository<ReferenceCategory, UUID> {
    Optional<ReferenceCategory> findByCode(String code);
    boolean existsByCode(String code);
}
