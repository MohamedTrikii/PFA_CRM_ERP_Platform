package com.erp.common.domain;

import com.erp.common.tenant.TenantContext;
import jakarta.persistence.PrePersist;

import java.util.UUID;

/**
 * Automatically stamps tenant_id from TenantContext before any insert.
 * Prevents code from accidentally saving cross-tenant data.
 */
public class TenantEntityListener {

    @PrePersist
    public void prePersist(TenantEntity entity) {
        if (entity.getTenantId() == null) {
            String tenantId = TenantContext.get();
            if (tenantId != null && !tenantId.isBlank()) {
                entity.setTenantId(UUID.fromString(tenantId));
            }
        }
    }
}
