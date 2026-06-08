package com.erp.identity.domain;

import com.erp.common.domain.BaseEntity;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Represents a company / tenant.
 * Does NOT extend TenantEntity — tenants are top-level, not scoped to a tenant.
 * RLS is NOT applied to this table (managed by SUPER_ADMIN only).
 */
@Entity
@Table(name = "tenants")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tenant extends BaseEntity {

    @NotBlank
    @Size(min = 2, max = 63)
    @Pattern(regexp = "^[a-z0-9-]+$", message = "slug must be lowercase alphanumeric with hyphens")
    @Column(nullable = false, unique = true, length = 63)
    private String slug;

    @NotBlank
    @Size(max = 255)
    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
}
