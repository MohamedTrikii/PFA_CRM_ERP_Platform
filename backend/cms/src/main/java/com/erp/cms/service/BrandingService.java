package com.erp.cms.service;

import com.erp.cms.domain.TenantBranding;
import com.erp.cms.dto.CmsDto;
import com.erp.cms.mapper.CmsMapper;
import com.erp.cms.repository.TenantBrandingRepository;
import com.erp.common.tenant.TenantUtils;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@SuppressWarnings("null")
public class BrandingService {

    private final TenantBrandingRepository repo;
    private final CmsMapper                mapper;
    private final SeaweedFsService         seaweedFs;
    private final ObjectMapper             objectMapper;

    @Value("${seaweedfs.filer.url:http://seaweed-filer:8888}")
    private String filerUrl;

    // ── Internal record for gallery JSON storage ───────────────────────────────

    private record GalleryItemRaw(String fid, String caption, String alt) {}

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static UUID tid() { return TenantUtils.safeTenantUuid(); }

    private TenantBranding getOrCreate() {
        return repo.findByTenantId(tid()).orElseGet(() -> {
            TenantBranding b = new TenantBranding();
            b.setTenantId(tid());
            return b;
        });
    }

    private <T> List<T> parseJson(String json, TypeReference<List<T>> ref) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, ref);
        } catch (Exception e) {
            log.warn("Failed to parse JSON: {}", e.getMessage());
            return List.of();
        }
    }

    private List<GalleryItemRaw> parseGalleryRaw(String json) {
        return new ArrayList<>(parseJson(json, new TypeReference<>() {}));
    }

    private List<CmsDto.GalleryItem> toGalleryItems(String json) {
        return parseGalleryRaw(json).stream()
                .map(r -> new CmsDto.GalleryItem(r.fid(), filerUrl + r.fid(), r.caption(), r.alt()))
                .toList();
    }

    private CmsDto.BrandingResponse toResponse(TenantBranding b) {
        String logoUrl    = b.getLogoFid()    != null ? filerUrl + b.getLogoFid()    : null;
        String faviconUrl = b.getFaviconFid() != null ? filerUrl + b.getFaviconFid() : null;

        List<CmsDto.ServiceItem> services = parseJson(b.getServicesJson(), new TypeReference<>() {});
        List<CmsDto.GalleryItem> gallery  = toGalleryItems(b.getGalleryJson());
        List<CmsDto.StatItem>    stats    = parseJson(b.getStatsJson(),    new TypeReference<>() {});

        return new CmsDto.BrandingResponse(
                b.getId(), b.getCompanyName(), b.getTagline(),
                logoUrl, faviconUrl,
                orDefault(b.getPrimaryColor(),   "#1976D2"),
                orDefault(b.getSecondaryColor(), "#424242"),
                orDefault(b.getFontFamily(),     "Inter, sans-serif"),
                b.getCustomCss(), b.getUpdatedAt(),
                b.getHeroTitle(), b.getHeroSubtitle(),
                orDefault(b.getHeroCtaText(), "Demander un devis"),
                b.getAboutTitle(), b.getAboutText(), b.getSiteDescription(),
                services, gallery, stats,
                b.getContactEmail(), b.getContactPhone(), b.getContactAddress(),
                b.getSocialFacebook(), b.getSocialLinkedin(),
                b.getSocialInstagram(), b.getSocialTwitter()
        );
    }

    private static String orDefault(String val, String def) {
        return (val != null && !val.isBlank()) ? val : def;
    }

    // ── Public methods ────────────────────────────────────────────────────────

    public CmsDto.BrandingResponse get() {
        return toResponse(getOrCreate());
    }

    /** Public (unauthenticated) lookup — queries directly by tenantId without TenantContext. */
    public CmsDto.BrandingResponse getPublic(UUID tenantId) {
        TenantBranding b = repo.findByTenantId(tenantId).orElseGet(() -> {
            TenantBranding def = new TenantBranding();
            def.setTenantId(tenantId);
            return def;
        });
        return toResponse(b);
    }

    @Transactional
    public CmsDto.BrandingResponse update(CmsDto.BrandingUpdateRequest req) {
        TenantBranding b = getOrCreate();
        mapper.updateBranding(req, b);
        return toResponse(Objects.requireNonNull(repo.save(b)));
    }

    @Transactional
    public CmsDto.BrandingResponse uploadLogo(MultipartFile file) throws IOException {
        TenantBranding b = getOrCreate();
        if (b.getLogoFid() != null) seaweedFs.delete(b.getLogoFid());
        b.setLogoFid(seaweedFs.upload(tid(), "branding", file));
        return toResponse(Objects.requireNonNull(repo.save(b)));
    }

    @Transactional
    public CmsDto.BrandingResponse uploadFavicon(MultipartFile file) throws IOException {
        TenantBranding b = getOrCreate();
        if (b.getFaviconFid() != null) seaweedFs.delete(b.getFaviconFid());
        b.setFaviconFid(seaweedFs.upload(tid(), "branding", file));
        return toResponse(Objects.requireNonNull(repo.save(b)));
    }

    public byte[] downloadLogo() {
        return repo.findByTenantId(tid())
                .map(b -> b.getLogoFid() != null ? seaweedFs.download(b.getLogoFid()) : null)
                .orElse(null);
    }

    // ── Gallery ───────────────────────────────────────────────────────────────

    @Transactional
    public CmsDto.BrandingResponse uploadGalleryImage(MultipartFile file, String caption, String alt)
            throws IOException {
        TenantBranding b   = getOrCreate();
        String         fid = seaweedFs.upload(tid(), "gallery", file);
        List<GalleryItemRaw> items = parseGalleryRaw(b.getGalleryJson());
        items.add(new GalleryItemRaw(fid,
                caption != null ? caption : "",
                alt     != null ? alt     : ""));
        b.setGalleryJson(objectMapper.writeValueAsString(items));
        return toResponse(Objects.requireNonNull(repo.save(b)));
    }

    @Transactional
    public CmsDto.BrandingResponse deleteGalleryImage(String fid) throws IOException {
        TenantBranding       b     = getOrCreate();
        List<GalleryItemRaw> items = parseGalleryRaw(b.getGalleryJson());
        items.removeIf(item -> item.fid().equals(fid));
        seaweedFs.delete(fid);
        b.setGalleryJson(objectMapper.writeValueAsString(items));
        return toResponse(Objects.requireNonNull(repo.save(b)));
    }
}
