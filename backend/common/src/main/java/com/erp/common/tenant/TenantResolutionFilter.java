package com.erp.common.tenant;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Resolves tenant_id from the JWT claim "tenant_id" forwarded by the gateway,
 * or falls back to the X-Tenant-Id header (internal service calls only).
 * Sets TenantContext for the duration of the request.
 */
@Component
@Order(1)
public class TenantResolutionFilter extends OncePerRequestFilter {

    private static final String TENANT_HEADER = "X-Tenant-Id";
    private static final String SYSTEM_TENANT = "00000000-0000-0000-0000-000000000001";

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        try {
            String tenantId = request.getHeader(TENANT_HEADER);
            if ((tenantId == null || tenantId.isBlank()) && isPublicSalesRequest(request)) {
                tenantId = SYSTEM_TENANT;
            }
            if (tenantId != null && !tenantId.isBlank()) {
                TenantContext.set(tenantId.trim());
            }
            chain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    private static boolean isPublicSalesRequest(HttpServletRequest request) {
        return "POST".equalsIgnoreCase(request.getMethod())
                && "/api/v1/sales/requests/public".equals(request.getRequestURI());
    }
}
