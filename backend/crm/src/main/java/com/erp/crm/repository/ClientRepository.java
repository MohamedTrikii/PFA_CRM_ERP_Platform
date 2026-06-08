package com.erp.crm.repository;

import com.erp.crm.domain.Client;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClientRepository extends JpaRepository<Client, UUID> {
    Optional<Client> findByIdAndTenantId(UUID id, UUID tenantId);
    Page<Client> findAllByTenantIdAndActiveTrue(UUID tenantId, Pageable pageable);
    Optional<Client> findByReferenceAndTenantId(String reference, UUID tenantId);
    boolean existsByReferenceAndTenantId(String reference, UUID tenantId);
}
