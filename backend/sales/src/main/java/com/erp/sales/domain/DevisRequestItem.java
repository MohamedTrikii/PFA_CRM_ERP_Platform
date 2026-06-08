package com.erp.sales.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "devis_request_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DevisRequestItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "request_id")
    private DevisRequest request;

    @Column(nullable = false)
    @Builder.Default
    private short quantity = 1;

    @Column(name = "width_mm", nullable = false, precision = 8, scale = 1)
    private BigDecimal widthMm;

    @Column(name = "height_mm", nullable = false, precision = 8, scale = 1)
    private BigDecimal heightMm;

    @Column(name = "profile_series", length = 64)
    private String profileSeries;

    @Column(name = "opening_type", length = 64)
    private String openingType;

    @Column(name = "glass_type", length = 64)
    private String glassType;

    @Column(length = 64)
    private String color;

    @Column(columnDefinition = "TEXT")
    private String accessories;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false)
    @Builder.Default
    private short position = 0;
}
