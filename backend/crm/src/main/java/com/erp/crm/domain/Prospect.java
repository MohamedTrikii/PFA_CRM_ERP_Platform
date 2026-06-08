package com.erp.crm.domain;

import com.erp.common.domain.TenantEntity;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.Filter;

import java.util.UUID;

@Entity
@Table(name = "prospects")
@Filter(name = "tenantFilter")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Prospect extends TenantEntity {

    @NotBlank
    @Column(nullable = false, length = 255)
    private String name;

    @Column(length = 255)
    private String email;

    @Column(length = 64)
    private String phone;

    @Column(length = 255)
    private String company;

    @Column(length = 32)
    private String source;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private ProspectStatus status = ProspectStatus.NOUVEAU;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "assigned_to")
    private UUID assignedTo;
}
