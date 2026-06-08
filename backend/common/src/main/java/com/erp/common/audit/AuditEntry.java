package com.erp.common.audit;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Append-only audit record.  Hash chain is maintained by PostgreSQL trigger
 * (V4 migration), so prev_hash / hash are always set on INSERT.
 *
 * Does NOT extend TenantEntity — audit entries are visible to SUPER_ADMIN
 * across all tenants and must not be filtered by the Hibernate tenant filter.
 */
@Entity
@Table(name = "audit_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "actor_id")
    private UUID actorId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private AuditAction action;

    @Column(name = "entity_type", length = 64)
    private String entityType;

    @Column(name = "entity_id")
    private String entityId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> payload;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "created_at", nullable = false, updatable = false,
            insertable = false,   // DB default now()
            columnDefinition = "timestamptz DEFAULT now()")
    private Instant createdAt;

    /** Set by the DB trigger — never assigned in Java. */
    @Column(name = "prev_hash", length = 64, insertable = false, updatable = false)
    private String prevHash;

    /** Set by the DB trigger — never assigned in Java. */
    @Column(name = "hash", length = 64, insertable = false, updatable = false)
    private String hash;
}
