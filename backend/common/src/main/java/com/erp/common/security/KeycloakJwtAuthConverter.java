package com.erp.common.security;

import com.erp.common.tenant.TenantContext;
import org.springframework.lang.NonNull;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Extracts realm roles from Keycloak JWT (realm_access.roles) and maps them
 * to Spring Security GrantedAuthority with "ROLE_" prefix.
 *
 * Also copies tenant_id claim to TenantContext so downstream components
 * (not on the HTTP thread path) can read it.
 */
@Component
@ConditionalOnProperty(name = "app.security.enabled", havingValue = "true", matchIfMissing = true)
public class KeycloakJwtAuthConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    @Override
    public AbstractAuthenticationToken convert(@NonNull Jwt jwt) {
        Collection<GrantedAuthority> authorities = extractRealmRoles(jwt);

        // Propagate tenant_id into thread-local context
        String tenantId = jwt.getClaimAsString(SecurityConstants.CLAIM_TENANT_ID);
        if (tenantId != null && !tenantId.isBlank()) {
            TenantContext.set(tenantId);
        }

        boolean isSuperAdmin = authorities.stream()
                .anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()));
        TenantContext.setSuperAdmin(isSuperAdmin);

        return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
    }

    private Collection<GrantedAuthority> extractRealmRoles(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaimAsMap(SecurityConstants.CLAIM_ROLES);
        if (realmAccess == null) return List.of();

        Object rolesObj = realmAccess.get("roles");
        if (!(rolesObj instanceof List<?> roles)) return List.of();

        return roles.stream()
            .filter(r -> r instanceof String)
            .map(r -> new SimpleGrantedAuthority("ROLE_" + r))
            .collect(Collectors.toUnmodifiableList());
    }
}
