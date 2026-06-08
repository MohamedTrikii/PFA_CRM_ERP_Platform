package com.erp.sales.repository;

import com.erp.sales.domain.Facture;
import com.erp.sales.domain.FactureStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FactureRepository extends JpaRepository<Facture, UUID> {

    @Query("SELECT COUNT(f) FROM Facture f WHERE f.tenantId = :tid")
    long countAllByTenant(@Param("tid") UUID tid);

    @Query("SELECT COUNT(f) FROM Facture f WHERE f.tenantId = :tid AND f.status = com.erp.sales.domain.FactureStatus.EN_RETARD")
    long countOverdueByTenant(@Param("tid") UUID tid);

    @Query("SELECT COALESCE(SUM(f.totalTtc), 0) FROM Facture f WHERE f.tenantId = :tid AND f.status = com.erp.sales.domain.FactureStatus.PAYEE AND f.issueDate >= :since")
    BigDecimal sumRevenueByTenantSince(@Param("tid") UUID tid, @Param("since") LocalDate since);

    @Query("SELECT f FROM Facture f LEFT JOIN FETCH f.lines WHERE f.tenantId = :tid AND f.id = :id")
    Optional<Facture> findByTenantAndIdWithLines(@Param("tid") UUID tid, @Param("id") UUID id);

    @Query("SELECT f FROM Facture f WHERE f.tenantId = :tid AND f.id = :id")
    Optional<Facture> findByTenantAndId(@Param("tid") UUID tid, @Param("id") UUID id);

    @Query("SELECT f FROM Facture f WHERE f.tenantId = :tid")
    Page<Facture> findAllByTenant(@Param("tid") UUID tid, Pageable pageable);

    @Query("SELECT f FROM Facture f WHERE f.tenantId = :tid AND f.commandeId = :commandeId")
    Optional<Facture> findByTenantAndCommande(@Param("tid") UUID tid, @Param("commandeId") UUID commandeId);

    @Query("SELECT f FROM Facture f WHERE f.tenantId = :tid AND f.status = :status")
    List<Facture> findByTenantAndStatus(@Param("tid") UUID tid, @Param("status") FactureStatus status);

    @Query("SELECT f FROM Facture f WHERE f.tenantId = :tid AND f.clientId = :clientId")
    List<Facture> findByTenantAndClient(@Param("tid") UUID tid, @Param("clientId") UUID clientId);

    @Query("SELECT f FROM Facture f WHERE f.tenantId = :tid AND f.status IN (com.erp.sales.domain.FactureStatus.EMISE, com.erp.sales.domain.FactureStatus.PARTIELLEMENT_PAYEE, com.erp.sales.domain.FactureStatus.EN_RETARD)")
    List<Facture> findUnpaidByTenant(@Param("tid") UUID tid);
}
