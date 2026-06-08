package com.erp.cms.repository;

import com.erp.cms.domain.TenantBranding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface TenantBrandingRepository extends JpaRepository<TenantBranding, UUID> {

    @Query("SELECT b FROM TenantBranding b WHERE b.tenantId = :tid")
    Optional<TenantBranding> findByTenantId(@Param("tid") UUID tid);
}
