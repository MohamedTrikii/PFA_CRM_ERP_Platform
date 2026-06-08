package com.erp.achat.domain;

import com.erp.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "bons_commande_lignes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BonCommandeLigne extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bon_commande_id", nullable = false)
    private BonCommande bonCommande;

    @Column(name = "product_id")
    private UUID productId;

    @Column(nullable = false, length = 255)
    private String designation;

    @Column(length = 64)
    private String reference;

    @Column(length = 32)
    @Builder.Default
    private String unite = "unité";

    @Column(nullable = false, precision = 14, scale = 3)
    private BigDecimal quantite;

    @Column(name = "prix_unitaire_ht", nullable = false, precision = 14, scale = 2)
    private BigDecimal prixUnitaireHt;

    @Column(name = "tva_rate", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal tvaRate = BigDecimal.valueOf(20);

    @Column(name = "total_ht", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalHt;

    @Column(nullable = false)
    @Builder.Default
    private int position = 0;
}
