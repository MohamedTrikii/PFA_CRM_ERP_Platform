package com.erp.achat.domain;

import com.erp.common.domain.TenantEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "bons_reception")
@Filter(name = "tenantFilter")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BonReception extends TenantEntity {

    @Column(name = "bon_commande_id", nullable = false)
    private UUID bonCommandeId;

    @Column(nullable = false, length = 64)
    private String reference;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private BonReceptionStatus status = BonReceptionStatus.EN_COURS;

    @Column(name = "date_reception", nullable = false)
    @Builder.Default
    private LocalDate dateReception = LocalDate.now();

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_by")
    private UUID createdBy;

    @OneToMany(mappedBy = "bonReception", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    @Builder.Default
    private List<BonReceptionLigne> lignes = new ArrayList<>();
}
