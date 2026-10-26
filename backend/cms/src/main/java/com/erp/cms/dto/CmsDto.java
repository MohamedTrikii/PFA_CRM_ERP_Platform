package com.erp.cms.dto;

import com.erp.cms.domain.NoticeSeverity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class CmsDto {

    private CmsDto() {}

    // ── Public-site content types ─────────────────────────────────────────────

    public record GalleryItem(String fid, String url, String caption, String alt) {}

    public record ServiceItem(String title, String description, String icon) {}

    public record StatItem(String label, String value) {}

    // ── Branding ─────────────────────────────────────────────────────────────

    public record BrandingResponse(
            UUID   id,
            String companyName,
            String tagline,
            String logoUrl,
            String faviconUrl,
            String primaryColor,
            String secondaryColor,
            String fontFamily,
            String customCss,
            Instant updatedAt,
            // Public site
            String heroTitle,
            String heroSubtitle,
            String heroCtaText,
            String aboutTitle,
            String aboutText,
            String siteDescription,
            List<ServiceItem>  services,
            List<GalleryItem>  gallery,
            List<StatItem>     stats,
            String contactEmail,
            String contactPhone,
            String contactAddress,
            String socialFacebook,
            String socialLinkedin,
            String socialInstagram,
            String socialTwitter
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
            UUID tenantId,
            // Public site content
            @Size(max = 255) String heroTitle,
            @Size(max = 512) String heroSubtitle,
            @Size(max = 100) String heroCtaText,
            @Size(max = 255) String aboutTitle,
            String aboutText,
            String siteDescription,
            String servicesJson,
            String statsJson,
            @Size(max = 255) String contactEmail,
            @Size(max = 50)  String contactPhone,
            String contactAddress,
            String socialFacebook,
            String socialLinkedin,
            String socialInstagram,
            String socialTwitter
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

    // ── Reference Data ────────────────────────────────────────────────────────

    public record RefCategoryResponse(
            UUID    id,
            String  code,
            String  name,
            String  description,
            String  icon,
            boolean system,
            int     sortOrder,
            int     valueCount,
            Instant updatedAt
    ) {}

    public record RefValueResponse(
            UUID    id,
            UUID    categoryId,
            String  categoryCode,
            String  code,
            String  label,
            String  labelFr,
            String  labelAr,
            String  labelEn,
            String  color,
            String  icon,
            int     sortOrder,
            boolean active,
            boolean defaultValue,
            Instant updatedAt
    ) {}

    public record RefCategoryCreateRequest(
            @NotBlank @Size(max = 100) String code,
            @NotBlank @Size(max = 255) String name,
            @Size(max = 500)           String description,
            @Size(max = 100)           String icon
    ) {}

    public record RefValueCreateRequest(
            @NotBlank @Size(max = 100) String  code,
            @NotBlank @Size(max = 255) String  label,
            @Size(max = 255)           String  labelFr,
            @Size(max = 255)           String  labelAr,
            @Size(max = 255)           String  labelEn,
            @Size(max = 50)            String  color,
            @Size(max = 100)           String  icon,
            Integer                    sortOrder,
            Boolean                    active,
            Boolean                    defaultValue
    ) {}

    public record RefValueUpdateRequest(
            @NotBlank @Size(max = 255) String  label,
            @Size(max = 255)           String  labelFr,
            @Size(max = 255)           String  labelAr,
            @Size(max = 255)           String  labelEn,
            @Size(max = 50)            String  color,
            @Size(max = 100)           String  icon,
            Integer                    sortOrder,
            Boolean                    active,
            Boolean                    defaultValue
    ) {}

    public record ReorderRequest(List<UUID> orderedIds) {}
}
