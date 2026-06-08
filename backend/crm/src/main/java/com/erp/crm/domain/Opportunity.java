package com.erp.crm.domain;

import com.erp.common.domain.TenantEntity;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "opportunities")
@Filter(name = "tenantFilter")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Opportunity extends TenantEntity {

    @Column(name = "client_id", nullable = false)
    private UUID clientId;

    @NotBlank
    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private OpportunityStatus status = OpportunityStatus.NOUVELLE;

    @Column(name = "estimated_value", precision = 14, scale = 2)
    private BigDecimal estimatedValue;

    @Min(0) @Max(100)
    private Short probability;

    @Column(name = "expected_close_date")
    private LocalDate expectedCloseDate;

    @Column(name = "assigned_to")
    private UUID assignedTo;
}
