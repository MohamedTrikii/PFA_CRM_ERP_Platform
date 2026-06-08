package com.erp.common.security;

public final class SecurityConstants {

    // Keycloak JWT claim names
    public static final String CLAIM_TENANT_ID = "tenant_id";
    public static final String CLAIM_ROLES     = "realm_access";

    // Role names (mirrored from Keycloak realm roles)
    public static final String ROLE_SUPER_ADMIN = "SUPER_ADMIN";
    public static final String ROLE_EMPLOYER    = "EMPLOYER";
    public static final String ROLE_EMPLOYEE    = "EMPLOYEE";
    public static final String ROLE_CLIENT      = "CLIENT";

    private SecurityConstants() {}
}
