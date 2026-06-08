package com.erp.sales.domain;

import com.erp.common.domain.TenantEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "factures")
@Filter(name = "tenantFilter")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Facture extends TenantEntity {

    @Column(name = "commande_id")
    private UUID commandeId;

    @Column(name = "client_id", nullable = false)
    private UUID clientId;

    @Column(nullable = false, length = 64)
    private String reference;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private FactureStatus status = FactureStatus.BROUILLON;

    @Column(name = "issue_date")
    private LocalDate issueDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "total_ht",  precision = 14, scale = 2) @Builder.Default private BigDecimal totalHt  = BigDecimal.ZERO;
    @Column(name = "total_tva", precision = 14, scale = 2) @Builder.Default private BigDecimal totalTva = BigDecimal.ZERO;
    @Column(name = "total_ttc", precision = 14, scale = 2) @Builder.Default private BigDecimal totalTtc = BigDecimal.ZERO;
    @Column(name = "amount_paid",precision = 14, scale = 2) @Builder.Default private BigDecimal amountPaid= BigDecimal.ZERO;

    @OneToMany(mappedBy = "facture", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<FactureLine> lines = new ArrayList<>();

    @OneToMany(mappedBy = "facture", cascade = CascadeType.ALL)
    @Builder.Default
    private List<Encaissement> encaissements = new ArrayList<>();

    public BigDecimal remainingAmount() { return totalTtc.subtract(amountPaid); }
}
