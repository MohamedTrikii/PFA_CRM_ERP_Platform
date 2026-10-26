package com.erp.common.audit;

import com.erp.common.tenant.TenantContext;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Map;
import java.util.UUID;
import java.util.Objects;

/**
 * Writes audit entries to the append-only hash-chained audit_log table.
 *
 * The hash chain is maintained by the PostgreSQL trigger (V4 migration),
 * so no Java-side hashing is needed.
 *
 * Uses REQUIRES_NEW propagation so audit entries are committed even when
 * the calling transaction rolls back (e.g., failed login attempts must still
 * be recorded).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditRepository auditRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(AuditAction action,
                    String entityType,
                    String entityId,
                    Map<String, Object> payload) {
        String tenantId = TenantContext.get();
        UUID tenantUuid = (tenantId != null && !tenantId.isBlank())
            ? UUID.fromString(tenantId)
            : UUID.fromString("00000000-0000-0000-0000-000000000001"); // system tenant

        AuditEntry entry = AuditEntry.builder()
            .tenantId(tenantUuid)
            .actorId(currentActorId())
            .action(action)
            .entityType(entityType)
            .entityId(entityId)
            .payload(payload)
            .ipAddress(currentIp())
            .build();

        try {
            auditRepository.save(Objects.requireNonNull(entry));
        } catch (Exception ex) {
            // Never let audit failures break the business operation
            log.error("Failed to write audit entry action={} entity={}/{}: {}",
                action, entityType, entityId, ex.getMessage());
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private UUID currentActorId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Jwt jwt)) return null;
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (Exception e) {
            return null;
        }
    }

    private String currentIp() {
        try {
            var attrs = RequestContextHolder.getRequestAttributes();
            if (attrs instanceof ServletRequestAttributes sra) {
                HttpServletRequest req = sra.getRequest();
                String xff = req.getHeader("X-Forwarded-For");
                return (xff != null) ? xff.split(",")[0].trim() : req.getRemoteAddr();
            }
        } catch (Exception ex) {
            log.debug("Could not extract request IP: {}", ex.getMessage());
        }
        return null;
    }
}
