package com.erp.identity.domain;

import com.erp.common.domain.TenantEntity;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.Filter;

/**
 * Application user — mirrors the Keycloak user and carries role + tenant_id.
 *
 * Hibernate "tenantFilter" is active on this entity whenever a request has
 * a tenant set in TenantContext (via TenantFilterInterceptor).
 */
@Entity
@Table(
    name = "users",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_users_keycloak", columnNames = "keycloak_id"),
        @UniqueConstraint(name = "uq_users_email_tenant", columnNames = {"tenant_id", "email"})
    }
)
@Filter(name = TenantEntity.FILTER_NAME)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends TenantEntity {

    /** Keycloak subject (sub claim). */
    @NotBlank
    @Column(name = "keycloak_id", nullable = false, updatable = false, length = 36)
    private String keycloakId;

    @Email
    @NotBlank
    @Column(nullable = false, length = 255)
    private String email;

    @Column(name = "display_name", length = 255)
    private String displayName;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private UserRole role;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    /**
     * Required for EMPLOYEE role; null for all other roles.
     * Stored as the enum name (VARCHAR) in PostgreSQL.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "employee_function", length = 32)
    private EmployeeFunction employeeFunction;
}
