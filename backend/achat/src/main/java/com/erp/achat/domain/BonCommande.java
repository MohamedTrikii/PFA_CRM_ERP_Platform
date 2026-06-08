package com.erp.achat.domain;

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
@Table(name = "bons_commande")
@Filter(name = "tenantFilter")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BonCommande extends TenantEntity {

    @Column(name = "fournisseur_id", nullable = false)
    private UUID fournisseurId;

    @Column(nullable = false, length = 64)
    private String reference;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private BonCommandeStatus status = BonCommandeStatus.BROUILLON;

    @Column(name = "date_commande")
    private LocalDate dateCommande;

    @Column(name = "date_livraison_prevue")
    private LocalDate dateLivraisonPrevue;

    @Column(name = "total_ht",  precision = 14, scale = 2) @Builder.Default private BigDecimal totalHt  = BigDecimal.ZERO;
    @Column(name = "total_tva", precision = 14, scale = 2) @Builder.Default private BigDecimal totalTva = BigDecimal.ZERO;
    @Column(name = "total_ttc", precision = 14, scale = 2) @Builder.Default private BigDecimal totalTtc = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_by")
    private UUID createdBy;

    @Transient
    private Fournisseur fournisseur;

    @OneToMany(mappedBy = "bonCommande", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    @Builder.Default
    private List<BonCommandeLigne> lignes = new ArrayList<>();
}
