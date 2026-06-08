package com.erp.sales.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Entity
@Table(name = "facture_lines")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FactureLine {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "facture_id")
    private Facture facture;

    @Column(name = "product_id")
    private UUID productId;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, precision = 10, scale = 3) @Builder.Default private BigDecimal quantity    = BigDecimal.ONE;
    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2) private BigDecimal unitPrice;
    @Column(name = "tva_rate",   nullable = false, precision = 5,  scale = 2) @Builder.Default private BigDecimal tvaRate     = new BigDecimal("20.00");
    @Column(name = "discount_pct", precision = 5, scale = 2)                  @Builder.Default private BigDecimal discountPct = BigDecimal.ZERO;
    @Column(name = "total_ht",  nullable = false, precision = 14, scale = 2) @Builder.Default private BigDecimal totalHt  = BigDecimal.ZERO;
    @Column(name = "total_tva", nullable = false, precision = 14, scale = 2) @Builder.Default private BigDecimal totalTva = BigDecimal.ZERO;
    @Column(name = "total_ttc", nullable = false, precision = 14, scale = 2) @Builder.Default private BigDecimal totalTtc = BigDecimal.ZERO;

    @PrePersist @PreUpdate
    void compute() {
        BigDecimal base     = quantity.multiply(unitPrice);
        BigDecimal discount = base.multiply(discountPct).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        totalHt  = base.subtract(discount).setScale(2, RoundingMode.HALF_UP);
        totalTva = totalHt.multiply(tvaRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        totalTtc = totalHt.add(totalTva).setScale(2, RoundingMode.HALF_UP);
    }
}
