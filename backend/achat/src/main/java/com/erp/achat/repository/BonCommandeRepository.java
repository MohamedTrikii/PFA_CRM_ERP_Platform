package com.erp.achat.repository;

import com.erp.achat.domain.BonCommande;
import com.erp.achat.domain.BonCommandeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface BonCommandeRepository extends JpaRepository<BonCommande, UUID> {

    @Query("SELECT bc FROM BonCommande bc WHERE bc.tenantId = :tid")
    Page<BonCommande> findAllByTenant(@Param("tid") UUID tid, Pageable pageable);

    @Query("SELECT bc FROM BonCommande bc LEFT JOIN FETCH bc.lignes WHERE bc.tenantId = :tid AND bc.id = :id")
    Optional<BonCommande> findByTenantAndIdWithLignes(@Param("tid") UUID tid, @Param("id") UUID id);

    @Query("SELECT bc FROM BonCommande bc WHERE bc.tenantId = :tid AND bc.id = :id")
    Optional<BonCommande> findByTenantAndId(@Param("tid") UUID tid, @Param("id") UUID id);

    @Query("SELECT bc FROM BonCommande bc WHERE bc.tenantId = :tid AND bc.status = :status")
    Page<BonCommande> findByTenantAndStatus(@Param("tid") UUID tid, @Param("status") BonCommandeStatus status, Pageable pageable);

    @Query("SELECT CASE WHEN COUNT(bc) > 0 THEN TRUE ELSE FALSE END FROM BonCommande bc WHERE bc.tenantId = :tid AND bc.reference = :ref")
    boolean existsByTenantAndReference(@Param("tid") UUID tid, @Param("ref") String ref);
}
