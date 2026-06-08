package com.erp.sales.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "livraison_lines")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LivraisonLine {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "livraison_id")
    private Livraison livraison;

    @Column(name = "product_id")
    private UUID productId;

    @Column(name = "product_reference", length = 64)
    private String productReference;

    @Column(name = "quantity_ordered", nullable = false, precision = 10, scale = 3)
    @Builder.Default
    private BigDecimal quantityOrdered = BigDecimal.ZERO;

    @Column(name = "quantity_delivered", nullable = false, precision = 10, scale = 3)
    @Builder.Default
    private BigDecimal quantityDelivered = BigDecimal.ZERO;
}
