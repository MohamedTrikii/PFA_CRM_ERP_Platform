package com.erp.common.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

import java.util.UUID;

/**
 * Base for every business entity that belongs to a single tenant.
 *
 * Hibernate filter "tenantFilter" is enabled per-request by TenantFilterInterceptor.
 * This provides application-level isolation; PostgreSQL RLS adds a DB-level second layer.
 */
@Getter
@Setter
@MappedSuperclass
@EntityListeners(TenantEntityListener.class)
@FilterDef(
    name     = TenantEntity.FILTER_NAME,
    defaultCondition = "tenant_id = :tenantId",
    parameters = @ParamDef(name = "tenantId", type = UUID.class)
)
@Filter(name = TenantEntity.FILTER_NAME)
public abstract class TenantEntity extends BaseEntity {

    public static final String FILTER_NAME = "tenantFilter";

    @Column(name = "tenant_id", nullable = false, updatable = false)
    private UUID tenantId;
}
