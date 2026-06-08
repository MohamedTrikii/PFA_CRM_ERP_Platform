package com.erp.inventory.domain;

import com.erp.common.domain.TenantEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "stock_items",
       uniqueConstraints = @UniqueConstraint(columnNames = {"tenant_id", "product_id", "location_id"}))
@Filter(name = "tenantFilter")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StockItem extends TenantEntity {

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "product_reference", length = 64)
    private String productReference;

    @Column(name = "product_name", length = 255)
    private String productName;

    @Column(name = "location_id")
    private UUID locationId;

    @Column(nullable = false, precision = 14, scale = 3)
    @Builder.Default
    private BigDecimal quantity = BigDecimal.ZERO;

    @Column(name = "reserved_quantity", nullable = false, precision = 14, scale = 3)
    @Builder.Default
    private BigDecimal reservedQuantity = BigDecimal.ZERO;

    public BigDecimal availableQuantity() {
        return quantity.subtract(reservedQuantity);
    }
}
