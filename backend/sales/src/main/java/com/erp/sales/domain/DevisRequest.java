package com.erp.sales.domain;

import com.erp.common.domain.TenantEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "devis_requests")
@Filter(name = "tenantFilter")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DevisRequest extends TenantEntity {

    @Column(name = "client_id")
    private UUID clientId;

    @Column(name = "client_name", nullable = false, length = 255)
    private String clientName;

    @Column(name = "client_email", length = 255)
    private String clientEmail;

    @Column(name = "client_phone", length = 32)
    private String clientPhone;

    @Column(name = "client_address", columnDefinition = "TEXT")
    private String clientAddress;

    @Column(name = "project_type", nullable = false, length = 64)
    private String projectType;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private DevisRequestStatus status = DevisRequestStatus.NOUVEAU;

    @Column(name = "converted_devis_id")
    private UUID convertedDevisId;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @OneToMany(mappedBy = "request", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<DevisRequestItem> items = new ArrayList<>();
}
