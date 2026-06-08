package com.erp.achat.domain;

import com.erp.common.domain.TenantEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;

@Entity
@Table(name = "fournisseurs")
@Filter(name = "tenantFilter")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Fournisseur extends TenantEntity {

    @Column(nullable = false, length = 255)
    private String nom;

    @Column(nullable = false, length = 64)
    private String code;

    @Column(length = 255)
    private String email;

    @Column(length = 64)
    private String telephone;

    @Column(columnDefinition = "TEXT")
    private String adresse;

    @Column(length = 64)
    @Builder.Default
    private String pays = "MA";

    @Column(nullable = false)
    @Builder.Default
    private boolean actif = true;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(length = 20)
    private String ice;

    @Column(length = 20)
    private String rc;

    @Column(length = 20)
    private String rib;

    @Column(name = "delai_paiement_jours", precision = 5, scale = 0)
    private java.math.BigDecimal delaiPaiementJours;
}
