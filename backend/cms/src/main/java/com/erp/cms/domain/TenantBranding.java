package com.erp.cms.domain;

import com.erp.common.domain.TenantEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;

@Entity
@Table(name = "tenant_branding")
@Filter(name = "tenantFilter")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TenantBranding extends TenantEntity {

    // ── Appearance ────────────────────────────────────────────────────────────

    @Column(name = "company_name", length = 255)
    private String companyName;

    @Column(length = 512)
    private String tagline;

    @Column(name = "logo_fid", columnDefinition = "TEXT")
    private String logoFid;

    @Column(name = "favicon_fid", columnDefinition = "TEXT")
    private String faviconFid;

    @Column(name = "primary_color", length = 16)
    @Builder.Default
    private String primaryColor = "#1976D2";

    @Column(name = "secondary_color", length = 16)
    @Builder.Default
    private String secondaryColor = "#424242";

    @Column(name = "font_family", length = 128)
    @Builder.Default
    private String fontFamily = "Inter, sans-serif";

    @Column(name = "custom_css", columnDefinition = "TEXT")
    private String customCss;

    // ── Public site content ───────────────────────────────────────────────────

    @Column(name = "hero_title", length = 255)
    private String heroTitle;

    @Column(name = "hero_subtitle", length = 512)
    private String heroSubtitle;

    @Column(name = "hero_cta_text", length = 100)
    @Builder.Default
    private String heroCtaText = "Demander un devis";

    @Column(name = "about_title", length = 255)
    private String aboutTitle;

    @Column(name = "about_text", columnDefinition = "TEXT")
    private String aboutText;

    @Column(name = "site_description", columnDefinition = "TEXT")
    private String siteDescription;

    // ── JSON blobs ────────────────────────────────────────────────────────────

    @Column(name = "services_json", columnDefinition = "TEXT")
    private String servicesJson;

    @Column(name = "gallery_json", columnDefinition = "TEXT")
    private String galleryJson;

    @Column(name = "stats_json", columnDefinition = "TEXT")
    private String statsJson;

    // ── Contact ───────────────────────────────────────────────────────────────

    @Column(name = "contact_email", length = 255)
    private String contactEmail;

    @Column(name = "contact_phone", length = 50)
    private String contactPhone;

    @Column(name = "contact_address", columnDefinition = "TEXT")
    private String contactAddress;

    // ── Social links ──────────────────────────────────────────────────────────

    @Column(name = "social_facebook", columnDefinition = "TEXT")
    private String socialFacebook;

    @Column(name = "social_linkedin", columnDefinition = "TEXT")
    private String socialLinkedin;

    @Column(name = "social_instagram", columnDefinition = "TEXT")
    private String socialInstagram;

    @Column(name = "social_twitter", columnDefinition = "TEXT")
    private String socialTwitter;
}
