package com.erp.crm.repository;

import com.erp.crm.domain.Opportunity;
import com.erp.crm.domain.OpportunityStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OpportunityRepository extends JpaRepository<Opportunity, UUID> {
    Optional<Opportunity> findByIdAndTenantId(UUID id, UUID tenantId);
    Page<Opportunity> findAllByTenantId(UUID tenantId, Pageable pageable);
    List<Opportunity> findAllByTenantIdAndStatus(UUID tenantId, OpportunityStatus status);
    List<Opportunity> findAllByClientIdAndTenantId(UUID clientId, UUID tenantId);
}
