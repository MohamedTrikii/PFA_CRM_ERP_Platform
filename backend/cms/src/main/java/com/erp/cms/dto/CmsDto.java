package com.erp.cms.dto;

import com.erp.cms.domain.NoticeSeverity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class CmsDto {

    private CmsDto() {}

    // ── Branding ─────────────────────────────────────────────────────────────

    public record BrandingResponse(
            UUID id,
            String companyName,
            String tagline,
            String logoUrl,
            String faviconUrl,
            String primaryColor,
            String secondaryColor,
            String fontFamily,
            String customCss,
            Instant updatedAt
    ) {}

    public record BrandingUpdateRequest(
            @Size(max = 255) String companyName,
            @Size(max = 512) String tagline,
            @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Must be a valid hex color like #1976D2")
            String primaryColor,
            @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Must be a valid hex color like #424242")
            String secondaryColor,
            @Size(max = 128) String fontFamily,
            @Size(max = 8000) String customCss,
            UUID tenantId   // SUPER_ADMIN only: target tenant override
    ) {}

    // ── Notices ──────────────────────────────────────────────────────────────

    public record NoticeResponse(
            UUID id,
            String title,
            String body,
            NoticeSeverity severity,
            boolean active,
            Instant startsAt,
            Instant endsAt,
            Instant createdAt
    ) {}

    public record NoticeCreateRequest(
            @NotBlank @Size(max = 255) String title,
            @Size(max = 4000) String body,
            NoticeSeverity severity,
            Instant startsAt,
            Instant endsAt
    ) {}

    public record NoticeUpdateRequest(
            @NotBlank @Size(max = 255) String title,
            @Size(max = 4000) String body,
            NoticeSeverity severity,
            boolean active,
            Instant startsAt,
            Instant endsAt
    ) {}

    // ── Super-Admin summary (cross-tenant) ────────────────────────────────────

    public record TenantSummary(
            UUID tenantId,
            String tenantName,
            boolean active,
            long userCount,
            String companyName,
            String primaryColor
    ) {}

    public record PlatformStats(
            long totalTenants,
            long activeTenants,
            long totalUsers
    ) {}
}
