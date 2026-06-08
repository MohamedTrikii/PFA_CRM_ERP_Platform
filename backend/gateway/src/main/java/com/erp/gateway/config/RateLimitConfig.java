package com.erp.gateway.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import reactor.core.publisher.Mono;

@Configuration
public class RateLimitConfig {

    /**
     * Rate-limit key = tenantId from JWT claim (for authenticated requests)
     * or "anon:<ip>" for unauthenticated requests (public endpoints like quote-request).
     * This prevents one tenant's traffic from exhausting quota for others.
     */
    @Bean
    public KeyResolver tenantKeyResolver() {
        return exchange -> exchange.getPrincipal()
                .filter(JwtAuthenticationToken.class::isInstance)
                .cast(JwtAuthenticationToken.class)
                .map(jwt -> {
                    String tenantId = jwt.getToken().getClaimAsString("tenant_id");
                    return tenantId != null ? "tenant:" + tenantId : "sub:" + jwt.getToken().getSubject();
                })
                .switchIfEmpty(Mono.fromSupplier(() -> {
                    var addr = exchange.getRequest().getRemoteAddress();
                    String ip = (addr != null) ? addr.getAddress().getHostAddress() : "unknown";
                    return "anon:" + ip;
                }));
    }
}
