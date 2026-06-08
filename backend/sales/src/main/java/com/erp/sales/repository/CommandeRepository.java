package com.erp.sales.repository;

import com.erp.sales.domain.Commande;
import com.erp.sales.domain.CommandeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CommandeRepository extends JpaRepository<Commande, UUID> {

    @Query("SELECT COUNT(c) FROM Commande c WHERE c.tenantId = :tid")
    long countAllByTenant(@Param("tid") UUID tid);

    @Query("SELECT COUNT(c) FROM Commande c WHERE c.tenantId = :tid AND c.status NOT IN (com.erp.sales.domain.CommandeStatus.LIVREE, com.erp.sales.domain.CommandeStatus.ANNULEE)")
    long countOpenByTenant(@Param("tid") UUID tid);

    @Query("SELECT c FROM Commande c WHERE c.tenantId = :tid AND c.id = :id")
    Optional<Commande> findByTenantAndId(@Param("tid") UUID tid, @Param("id") UUID id);

    @Query("SELECT c FROM Commande c WHERE c.tenantId = :tid")
    Page<Commande> findAllByTenant(@Param("tid") UUID tid, Pageable pageable);

    @Query("SELECT c FROM Commande c WHERE c.tenantId = :tid AND c.devisId = :devisId")
    Optional<Commande> findByTenantAndDevis(@Param("tid") UUID tid, @Param("devisId") UUID devisId);

    @Query("SELECT c FROM Commande c WHERE c.tenantId = :tid AND c.status = :status")
    List<Commande> findByTenantAndStatus(@Param("tid") UUID tid, @Param("status") CommandeStatus status);
}
