package com.erp.sales.domain;

import com.erp.common.domain.TenantEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "livraisons")
@Filter(name = "tenantFilter")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Livraison extends TenantEntity {

    @Column(name = "commande_id", nullable = false)
    private UUID commandeId;

    @Column(nullable = false, length = 64)
    private String reference;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private LivraisonStatus status = LivraisonStatus.PLANIFIEE;

    @Column(name = "delivery_date")
    private LocalDate deliveryDate;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @OneToMany(mappedBy = "livraison", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<LivraisonLine> lines = new ArrayList<>();
}
