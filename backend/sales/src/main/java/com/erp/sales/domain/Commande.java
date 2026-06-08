package com.erp.sales.domain;

import com.erp.common.domain.TenantEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "commandes")
@Filter(name = "tenantFilter")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Commande extends TenantEntity {

    @Column(name = "devis_id", nullable = false)
    private UUID devisId;

    @Column(nullable = false, length = 64)
    private String reference;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private CommandeStatus status = CommandeStatus.EN_ATTENTE;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "delivery_address", columnDefinition = "jsonb")
    private Map<String, Object> deliveryAddress;

    @Column(name = "expected_delivery_date")
    private LocalDate expectedDeliveryDate;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
