package com.erp.sales.domain;

import com.erp.common.domain.TenantEntity;
import jakarta.persistence.*;
import jakarta.validation.constraints.Positive;
import lombok.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "encaissements")
@Filter(name = "tenantFilter")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Encaissement extends TenantEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "facture_id")
    private Facture facture;

    @Positive
    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(name = "payment_date", nullable = false)
    @Builder.Default
    private LocalDate paymentDate = LocalDate.now();

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 32)
    @Builder.Default
    private PaymentMethod paymentMethod = PaymentMethod.VIREMENT;

    @Column(length = 64)
    private String reference;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
