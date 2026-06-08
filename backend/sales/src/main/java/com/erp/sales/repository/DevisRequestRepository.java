package com.erp.sales.repository;

import com.erp.sales.domain.DevisRequest;
import com.erp.sales.domain.DevisRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DevisRequestRepository extends JpaRepository<DevisRequest, UUID> {

    @Query("SELECT COUNT(r) FROM DevisRequest r WHERE r.tenantId = :tid")
    long countAllByTenant(@Param("tid") UUID tid);

    @Query("SELECT COUNT(r) FROM DevisRequest r WHERE r.tenantId = :tid AND r.status IN (com.erp.sales.domain.DevisRequestStatus.NOUVEAU, com.erp.sales.domain.DevisRequestStatus.EN_ETUDE)")
    long countPendingByTenant(@Param("tid") UUID tid);

    @Query("SELECT COUNT(r) FROM DevisRequest r WHERE r.tenantId = :tid AND r.status = :status")
    long countByTenantAndStatus(@Param("tid") UUID tid, @Param("status") DevisRequestStatus status);

    @Query("SELECT COUNT(r) FROM DevisRequest r WHERE r.tenantId = :tid AND r.clientEmail = :email")
    long countByTenantAndEmail(@Param("tid") UUID tid, @Param("email") String email);

    @Query("SELECT r FROM DevisRequest r LEFT JOIN FETCH r.items WHERE r.tenantId = :tid AND r.id = :id")
    Optional<DevisRequest> findByTenantAndIdWithItems(@Param("tid") UUID tid, @Param("id") UUID id);

    @Query("SELECT r FROM DevisRequest r WHERE r.tenantId = :tid")
    Page<DevisRequest> findAllByTenant(@Param("tid") UUID tid, Pageable pageable);

    @Query("SELECT r FROM DevisRequest r WHERE r.tenantId = :tid AND r.status = :status")
    List<DevisRequest> findByTenantAndStatus(@Param("tid") UUID tid, @Param("status") DevisRequestStatus status);

    @Query("SELECT r FROM DevisRequest r WHERE r.tenantId = :tid AND r.clientEmail = :email")
    List<DevisRequest> findByTenantAndClientEmail(@Param("tid") UUID tid, @Param("email") String email);

    @Query("SELECT r FROM DevisRequest r WHERE r.tenantId = :tid AND r.id = :id")
    Optional<DevisRequest> findByTenantAndId(@Param("tid") UUID tid, @Param("id") UUID id);
}
