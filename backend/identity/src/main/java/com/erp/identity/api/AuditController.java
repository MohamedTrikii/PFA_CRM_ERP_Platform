package com.erp.identity.api;

import com.erp.common.audit.AuditAction;
import com.erp.common.audit.AuditEntry;
import com.erp.common.audit.AuditRepository;
import com.erp.common.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/identity/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditRepository auditRepository;

    /**
     * SUPER_ADMIN: see all entries across all tenants.
     * EMPLOYER:    see only their own tenant's entries.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public Page<AuditEntry> list(
            @PageableDefault(size = 50) Pageable pageable,
            @RequestParam(required = false) AuditAction action,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {

        boolean isSuperAdmin = TenantContext.get() == null
            || TenantContext.get().equals("system");

        if (isSuperAdmin) {
            return auditRepository.findAllByOrderByIdDesc(pageable);
        }

        UUID tenantId = UUID.fromString(TenantContext.requireTenant());

        if (from != null && to != null) {
            return auditRepository
                .findAllByTenantIdAndCreatedAtBetweenOrderByIdDesc(tenantId, from, to, pageable);
        }
        if (action != null) {
            return auditRepository
                .findAllByTenantIdAndActionOrderByIdDesc(tenantId, action, pageable);
        }
        return auditRepository.findAllByTenantIdOrderByIdDesc(tenantId, pageable);
    }

    /**
     * Returns the most recent N entries for chain-integrity verification.
     * SUPER_ADMIN only.
     */
    @GetMapping("/tail")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public Page<AuditEntry> tail(
            @PageableDefault(size = 10) Pageable pageable,
            @RequestParam UUID tenantId) {
        return auditRepository.findAllByTenantIdOrderByIdDesc(tenantId, pageable);
    }
}
