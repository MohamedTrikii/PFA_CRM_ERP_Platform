package com.erp.sales.repository;

import com.erp.sales.domain.Livraison;
import com.erp.sales.domain.LivraisonStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LivraisonRepository extends JpaRepository<Livraison, UUID> {

    @Query("SELECT COUNT(l) FROM Livraison l WHERE l.tenantId = :tid AND l.status IN (com.erp.sales.domain.LivraisonStatus.PLANIFIEE, com.erp.sales.domain.LivraisonStatus.EN_COURS)")
    long countPendingByTenant(@Param("tid") UUID tid);

    @Query("SELECT COUNT(l) FROM Livraison l WHERE l.tenantId = :tid AND l.status = :status")
    long countByTenantAndStatus(@Param("tid") UUID tid, @Param("status") LivraisonStatus status);

    @Query("SELECT l FROM Livraison l LEFT JOIN FETCH l.lines WHERE l.tenantId = :tid AND l.id = :id")
    Optional<Livraison> findByTenantAndIdWithLines(@Param("tid") UUID tid, @Param("id") UUID id);

    @Query("SELECT l FROM Livraison l WHERE l.tenantId = :tid AND l.id = :id")
    Optional<Livraison> findByTenantAndId(@Param("tid") UUID tid, @Param("id") UUID id);

    @Query("SELECT l FROM Livraison l WHERE l.tenantId = :tid")
    Page<Livraison> findAllByTenant(@Param("tid") UUID tid, Pageable pageable);

    @Query("SELECT l FROM Livraison l WHERE l.tenantId = :tid AND l.commandeId = :commandeId")
    List<Livraison> findByTenantAndCommande(@Param("tid") UUID tid, @Param("commandeId") UUID commandeId);

    @Query("SELECT l FROM Livraison l WHERE l.tenantId = :tid AND l.status = :status")
    List<Livraison> findByTenantAndStatus(@Param("tid") UUID tid, @Param("status") LivraisonStatus status);
}
