package com.erp.crm.repository;

import com.erp.crm.domain.Prospect;
import com.erp.crm.domain.ProspectStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProspectRepository extends JpaRepository<Prospect, UUID> {
    Optional<Prospect> findByIdAndTenantId(UUID id, UUID tenantId);
    Page<Prospect> findAllByTenantId(UUID tenantId, Pageable pageable);
    List<Prospect> findAllByTenantIdAndStatus(UUID tenantId, ProspectStatus status);
}
