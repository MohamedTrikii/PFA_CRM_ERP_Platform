package com.erp.sales.repository;

import com.erp.sales.domain.Devis;
import com.erp.sales.domain.DevisStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DevisRepository extends JpaRepository<Devis, UUID> {

    @Query("SELECT COUNT(d) FROM Devis d WHERE d.tenantId = :tid")
    long countAllByTenant(@Param("tid") UUID tid);

    @Query("SELECT COUNT(d) FROM Devis d WHERE d.tenantId = :tid AND d.status IN (com.erp.sales.domain.DevisStatus.BROUILLON, com.erp.sales.domain.DevisStatus.ENVOYE)")
    long countOpenByTenant(@Param("tid") UUID tid);

    @Query("SELECT COUNT(d) FROM Devis d WHERE d.tenantId = :tid AND d.clientId = :clientId")
    long countByTenantAndClient(@Param("tid") UUID tid, @Param("clientId") UUID clientId);

    @Query("SELECT COUNT(d) FROM Devis d WHERE d.tenantId = :tid AND d.clientId = :clientId AND d.status = :status")
    long countByTenantAndClientAndStatus(@Param("tid") UUID tid, @Param("clientId") UUID clientId, @Param("status") DevisStatus status);

    @Query("SELECT d FROM Devis d LEFT JOIN FETCH d.lines WHERE d.tenantId = :tid AND d.id = :id")
    Optional<Devis> findByTenantAndIdWithLines(@Param("tid") UUID tid, @Param("id") UUID id);

    @Query("SELECT d FROM Devis d WHERE d.tenantId = :tid")
    Page<Devis> findAllByTenant(@Param("tid") UUID tid, Pageable pageable);

    @Query("SELECT d FROM Devis d WHERE d.tenantId = :tid AND d.clientId = :clientId")
    List<Devis> findByTenantAndClient(@Param("tid") UUID tid, @Param("clientId") UUID clientId);

    @Query("SELECT d FROM Devis d WHERE d.tenantId = :tid AND d.status = :status")
    List<Devis> findByTenantAndStatus(@Param("tid") UUID tid, @Param("status") DevisStatus status);

    @Query("SELECT d FROM Devis d WHERE d.tenantId = :tid AND d.id = :id")
    Optional<Devis> findByTenantAndId(@Param("tid") UUID tid, @Param("id") UUID id);
}
