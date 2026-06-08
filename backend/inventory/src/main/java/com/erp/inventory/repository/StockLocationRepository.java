package com.erp.inventory.repository;

import com.erp.inventory.domain.StockLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StockLocationRepository extends JpaRepository<StockLocation, UUID> {

    @Query("SELECT l FROM StockLocation l WHERE l.tenantId = :tid AND l.active = true ORDER BY l.name")
    List<StockLocation> findAllActiveByTenant(@Param("tid") UUID tid);

    @Query("SELECT l FROM StockLocation l WHERE l.tenantId = :tid AND l.id = :id")
    Optional<StockLocation> findByTenantAndId(@Param("tid") UUID tid, @Param("id") UUID id);
}
