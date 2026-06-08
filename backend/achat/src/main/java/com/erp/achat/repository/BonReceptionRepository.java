package com.erp.achat.repository;

import com.erp.achat.domain.BonReception;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BonReceptionRepository extends JpaRepository<BonReception, UUID> {

    @Query("SELECT br FROM BonReception br WHERE br.tenantId = :tid")
    Page<BonReception> findAllByTenant(@Param("tid") UUID tid, Pageable pageable);

    @Query("SELECT br FROM BonReception br LEFT JOIN FETCH br.lignes WHERE br.tenantId = :tid AND br.id = :id")
    Optional<BonReception> findByTenantAndIdWithLignes(@Param("tid") UUID tid, @Param("id") UUID id);

    @Query("SELECT br FROM BonReception br WHERE br.tenantId = :tid AND br.id = :id")
    Optional<BonReception> findByTenantAndId(@Param("tid") UUID tid, @Param("id") UUID id);

    @Query("SELECT br FROM BonReception br WHERE br.tenantId = :tid AND br.bonCommandeId = :bcId")
    List<BonReception> findByTenantAndBonCommande(@Param("tid") UUID tid, @Param("bcId") UUID bcId);
}
