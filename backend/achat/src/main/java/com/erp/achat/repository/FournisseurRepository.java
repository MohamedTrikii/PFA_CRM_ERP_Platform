package com.erp.achat.repository;

import com.erp.achat.domain.Fournisseur;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface FournisseurRepository extends JpaRepository<Fournisseur, UUID> {

    @Query("SELECT f FROM Fournisseur f WHERE f.tenantId = :tid")
    Page<Fournisseur> findAllByTenant(@Param("tid") UUID tid, Pageable pageable);

    @Query("SELECT f FROM Fournisseur f WHERE f.tenantId = :tid AND f.id = :id")
    Optional<Fournisseur> findByTenantAndId(@Param("tid") UUID tid, @Param("id") UUID id);

    @Query("SELECT f FROM Fournisseur f WHERE f.tenantId = :tid AND f.actif = true")
    Page<Fournisseur> findActiveByTenant(@Param("tid") UUID tid, Pageable pageable);

    @Query("SELECT CASE WHEN COUNT(f) > 0 THEN TRUE ELSE FALSE END FROM Fournisseur f WHERE f.tenantId = :tid AND f.code = :code")
    boolean existsByTenantAndCode(@Param("tid") UUID tid, @Param("code") String code);
}
