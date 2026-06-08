package com.erp.inventory.repository;

import com.erp.inventory.domain.StockItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StockItemRepository extends JpaRepository<StockItem, UUID> {

    @Query("SELECT i FROM StockItem i WHERE i.tenantId = :tid")
    Page<StockItem> findAllByTenant(@Param("tid") UUID tid, Pageable pageable);

    @Query("SELECT i FROM StockItem i WHERE i.tenantId = :tid AND i.productId = :productId")
    List<StockItem> findByTenantAndProduct(@Param("tid") UUID tid, @Param("productId") UUID productId);

    @Query("SELECT i FROM StockItem i WHERE i.tenantId = :tid AND i.productId = :productId AND i.locationId = :locationId")
    Optional<StockItem> findByTenantProductAndLocation(@Param("tid") UUID tid,
                                                        @Param("productId") UUID productId,
                                                        @Param("locationId") UUID locationId);

    @Query("SELECT i FROM StockItem i WHERE i.tenantId = :tid AND (i.quantity - i.reservedQuantity) < :threshold")
    List<StockItem> findLowStock(@Param("tid") UUID tid, @Param("threshold") BigDecimal threshold);
}
