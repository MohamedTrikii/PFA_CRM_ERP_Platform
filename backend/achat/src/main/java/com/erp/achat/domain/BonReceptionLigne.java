package com.erp.achat.domain;

import com.erp.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "bons_reception_lignes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BonReceptionLigne extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bon_reception_id", nullable = false)
    private BonReception bonReception;

    @Column(name = "bon_commande_ligne_id")
    private UUID bonCommandeLigneId;

    @Column(name = "product_id")
    private UUID productId;

    @Column(nullable = false, length = 255)
    private String designation;

    @Column(name = "quantite_commandee", precision = 14, scale = 3)
    @Builder.Default
    private BigDecimal quantiteCommandee = BigDecimal.ZERO;

    @Column(name = "quantite_recue", nullable = false, precision = 14, scale = 3)
    private BigDecimal quantiteRecue;

    @Column(name = "location_id")
    private UUID locationId;

    @Column(nullable = false)
    @Builder.Default
    private int position = 0;
}
