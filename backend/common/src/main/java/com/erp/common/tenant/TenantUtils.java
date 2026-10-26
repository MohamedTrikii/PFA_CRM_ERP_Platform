package com.erp.common.tenant;

import java.util.UUID;

public final class TenantUtils {

    public static final UUID SYSTEM_TENANT = UUID.fromString("00000000-0000-0000-0000-000000000001");

    private TenantUtils() {}

    /**
     * Returns the current tenant UUID if present and valid, otherwise returns the system tenant.
     * Use for demo/default-safe lookups where missing tenant context should not throw.
     */
    public static UUID safeTenantUuid() {
        String t = TenantContext.get();
        if (t == null || t.isBlank()) return SYSTEM_TENANT;
        try {
            return UUID.fromString(t);
        } catch (Exception e) {
            return SYSTEM_TENANT;
        }
    }

    /**
     * Parse a tenant id string and return the UUID or null if invalid/blank.
     */
    public static UUID parseOrNull(String tenantId) {
        if (tenantId == null || tenantId.isBlank()) return null;
        try {
            return UUID.fromString(tenantId);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Strict require: throws if no tenant present or invalid.
     */
    public static UUID requireTenantUuid() {
        return UUID.fromString(TenantContext.requireTenant());
    }
}
