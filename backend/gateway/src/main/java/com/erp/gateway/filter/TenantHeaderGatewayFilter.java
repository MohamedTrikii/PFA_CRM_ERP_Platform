package com.erp.gateway.filter;

import com.erp.common.security.SecurityConstants;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

/**
 * Extracts tenant_id from the validated JWT and injects it as X-Tenant-Id header
 * so downstream services don't need to re-parse the JWT.
 */
@Component
public class TenantHeaderGatewayFilter extends AbstractGatewayFilterFactory<Object> {

    @Override
    public String name() {
        return "TenantHeaderFilter";
    }

    @Override
    public GatewayFilter apply(Object config) {
        return (exchange, chain) ->
            ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication())
                .filter(auth -> auth instanceof JwtAuthenticationToken)
                .cast(JwtAuthenticationToken.class)
                .map(JwtAuthenticationToken::getToken)
                .map(jwt -> {
                    String t = java.util.Objects.toString(jwt.getClaimAsString(SecurityConstants.CLAIM_TENANT_ID), "");
                    if ("system".equalsIgnoreCase(t)) {
                        // canonical system tenant UUID used across services
                        return "00000000-0000-0000-0000-000000000001";
                    }
                    return t;
                })
                .flatMap(tenantId -> {
                    var mutated = exchange.getRequest().mutate()
                        .header("X-Tenant-Id", tenantId)
                        .build();
                    return chain.filter(exchange.mutate().request(mutated).build());
                })
                .switchIfEmpty(chain.filter(exchange));
    }
}
