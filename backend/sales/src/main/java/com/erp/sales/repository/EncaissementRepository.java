package com.erp.sales.repository;

import com.erp.sales.domain.Encaissement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EncaissementRepository extends JpaRepository<Encaissement, UUID> {

    @Query("SELECT e FROM Encaissement e WHERE e.tenantId = :tid AND e.facture.id = :factureId ORDER BY e.paymentDate DESC")
    List<Encaissement> findByTenantAndFacture(@Param("tid") UUID tid, @Param("factureId") UUID factureId);

    @Query("SELECT e FROM Encaissement e WHERE e.tenantId = :tid AND e.id = :id")
    Optional<Encaissement> findByTenantAndId(@Param("tid") UUID tid, @Param("id") UUID id);
}
