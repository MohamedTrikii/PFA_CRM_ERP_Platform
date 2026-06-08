package com.erp.inventory.repository;

import com.erp.inventory.domain.MovementType;
import com.erp.inventory.domain.StockMovement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface StockMovementRepository extends JpaRepository<StockMovement, UUID> {

    @Query("SELECT m FROM StockMovement m WHERE m.tenantId = :tid ORDER BY m.occurredAt DESC")
    Page<StockMovement> findAllByTenant(@Param("tid") UUID tid, Pageable pageable);

    @Query("SELECT m FROM StockMovement m WHERE m.tenantId = :tid AND m.productId = :productId ORDER BY m.occurredAt DESC")
    List<StockMovement> findByTenantAndProduct(@Param("tid") UUID tid, @Param("productId") UUID productId);

    @Query("SELECT m FROM StockMovement m WHERE m.tenantId = :tid AND m.referenceType = :refType AND m.referenceId = :refId")
    List<StockMovement> findByReference(@Param("tid") UUID tid,
                                         @Param("refType") String refType,
                                         @Param("refId") UUID refId);

    @Query("SELECT m FROM StockMovement m WHERE m.tenantId = :tid AND m.movementType = :type ORDER BY m.occurredAt DESC")
    List<StockMovement> findByTenantAndType(@Param("tid") UUID tid, @Param("type") MovementType type);
}
