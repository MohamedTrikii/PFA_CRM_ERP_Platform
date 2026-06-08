package com.erp.common.tenant;

public final class TenantContext {

    private static final ThreadLocal<String> CURRENT = new ThreadLocal<>();

    private TenantContext() {}

    public static void set(String tenantId) {
        CURRENT.set(tenantId);
    }

    public static String get() {
        return CURRENT.get();
    }

    public static void clear() {
        CURRENT.remove();
    }

    /** Throws if no tenant is set — use inside secured service methods. */
    public static String requireTenant() {
        String t = CURRENT.get();
        if (t == null || t.isBlank()) {
            throw new IllegalStateException("No tenant in context – request must be authenticated");
        }
        return t;
    }
}
