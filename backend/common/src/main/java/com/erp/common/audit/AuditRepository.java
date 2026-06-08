package com.erp.common.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AuditRepository extends JpaRepository<AuditEntry, Long> {

    Optional<AuditEntry> findTopByTenantIdOrderByIdDesc(UUID tenantId);

    Page<AuditEntry> findAllByTenantIdOrderByIdDesc(UUID tenantId, Pageable pageable);

    Page<AuditEntry> findAllByOrderByIdDesc(Pageable pageable);

    Page<AuditEntry> findAllByTenantIdAndActionOrderByIdDesc(
        UUID tenantId, AuditAction action, Pageable pageable);

    Page<AuditEntry> findAllByTenantIdAndCreatedAtBetweenOrderByIdDesc(
        UUID tenantId, Instant from, Instant to, Pageable pageable);
}
