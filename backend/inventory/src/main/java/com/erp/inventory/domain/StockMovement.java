package com.erp.inventory.domain;

import com.erp.common.domain.TenantEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Immutable ledger entry — never updated, only inserted.
 * RLS policy enforces INSERT-only for the app role.
 */
@Entity
@Table(name = "stock_movements")
@Filter(name = "tenantFilter")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StockMovement extends TenantEntity {

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "product_reference", length = 64)
    private String productReference;

    @Column(name = "location_id")
    private UUID locationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type", nullable = false, length = 16)
    private MovementType movementType;

    @Column(nullable = false, precision = 14, scale = 3)
    private BigDecimal quantity;

    @Column(name = "reference_type", length = 32)
    private String referenceType;

    @Column(name = "reference_id")
    private UUID referenceId;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "occurred_at", nullable = false)
    @Builder.Default
    private Instant occurredAt = Instant.now();
}
