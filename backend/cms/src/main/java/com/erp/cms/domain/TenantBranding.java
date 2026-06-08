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
}
