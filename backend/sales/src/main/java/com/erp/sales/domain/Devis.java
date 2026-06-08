package com.erp.sales.domain;

import com.erp.common.domain.TenantEntity;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "devis")
@Filter(name = "tenantFilter")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Devis extends TenantEntity {

    @Column(name = "client_id", nullable = false)
    private UUID clientId;

    @Column(name = "opportunity_id")
    private UUID opportunityId;

    @NotBlank
    @Column(nullable = false, length = 64)
    private String reference;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private DevisStatus status = DevisStatus.BROUILLON;

    @Column(name = "valid_until")
    private LocalDate validUntil;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "discount_pct", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal discountPct = BigDecimal.ZERO;

    @Column(name = "total_ht", precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal totalHt = BigDecimal.ZERO;

    @Column(name = "total_tva", precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal totalTva = BigDecimal.ZERO;

    @Column(name = "total_ttc", precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal totalTtc = BigDecimal.ZERO;

    @OneToMany(mappedBy = "devis", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    @Builder.Default
    private List<DevisLine> lines = new ArrayList<>();

    public void addLine(DevisLine line) {
        line.setDevis(this);
        lines.add(line);
        recalculate();
    }

    /** Recalculates totals from lines. */
    public void recalculate() {
        totalHt  = lines.stream().map(DevisLine::getTotalHt).reduce(BigDecimal.ZERO, BigDecimal::add);
        totalTva = lines.stream()
            .map(l -> l.getTotalHt().multiply(l.getTvaRate()).divide(new BigDecimal("100")))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        totalTtc = totalHt.add(totalTva);
    }
}
