package com.erp.sales.repository;

import com.erp.sales.domain.CatalogProduct;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CatalogProductRepository extends JpaRepository<CatalogProduct, UUID> {

    @Query("SELECT p FROM CatalogProduct p WHERE p.tenantId = :tid AND p.active = true ORDER BY p.name")
    List<CatalogProduct> findAllActiveByTenant(@Param("tid") UUID tid);

    @Query("SELECT p FROM CatalogProduct p WHERE p.tenantId = :tid")
    Page<CatalogProduct> findAllByTenant(@Param("tid") UUID tid, Pageable pageable);

    @Query("SELECT p FROM CatalogProduct p WHERE p.tenantId = :tid AND p.id = :id")
    Optional<CatalogProduct> findByTenantAndId(@Param("tid") UUID tid, @Param("id") UUID id);

    @Query("SELECT p FROM CatalogProduct p WHERE p.tenantId = :tid AND p.reference = :ref")
    Optional<CatalogProduct> findByTenantAndReference(@Param("tid") UUID tid, @Param("ref") String ref);

    boolean existsByTenantIdAndReference(UUID tenantId, String reference);
}
