package com.erp.cms.domain;

import com.erp.common.domain.TenantEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;

import java.time.Instant;

@Entity
@Table(name = "tenant_notices")
@Filter(name = "tenantFilter")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TenantNotice extends TenantEntity {

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private NoticeSeverity severity = NoticeSeverity.INFO;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "starts_at")
    private Instant startsAt;

    @Column(name = "ends_at")
    private Instant endsAt;
}
