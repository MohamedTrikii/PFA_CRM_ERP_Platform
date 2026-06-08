package com.erp.sales.domain;

import com.erp.common.domain.TenantEntity;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;

@Entity
@Table(name = "catalog_products")
@Filter(name = "tenantFilter")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CatalogProduct extends TenantEntity {

    @NotBlank
    @Column(nullable = false, length = 64)
    private String reference;

    @NotBlank
    @Column(nullable = false, length = 255)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "unit_price", precision = 12, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal unitPrice = BigDecimal.ZERO;

    @Column(name = "tva_rate", precision = 5, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal tvaRate = new BigDecimal("20.00");

    @Column(nullable = false, length = 32)
    @Builder.Default
    private String unit = "unité";

    @Column(length = 64)
    private String category;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
}
