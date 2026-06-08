package com.erp.cms.service;

import com.erp.cms.domain.TenantBranding;
import com.erp.cms.dto.CmsDto;
import com.erp.cms.mapper.CmsMapper;
import com.erp.cms.repository.TenantBrandingRepository;
import com.erp.common.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BrandingService {

    private final TenantBrandingRepository repo;
    private final CmsMapper                mapper;
    private final SeaweedFsService         seaweedFs;

    @Value("${seaweedfs.filer.url:http://seaweed-filer:8888}")
    private String filerUrl;

    private static UUID tid() { return UUID.fromString(TenantContext.requireTenant()); }

    private TenantBranding getOrCreate() {
        return repo.findByTenantId(tid()).orElseGet(() -> {
            TenantBranding b = new TenantBranding();
            b.setTenantId(tid());
            return b;
        });
    }

    public CmsDto.BrandingResponse get() {
        return toResponse(getOrCreate());
    }

    @Transactional
    public CmsDto.BrandingResponse update(CmsDto.BrandingUpdateRequest req) {
        TenantBranding b = getOrCreate();
        mapper.updateBranding(req, b);
        return toResponse(repo.save(b));
    }

    @Transactional
    public CmsDto.BrandingResponse uploadLogo(MultipartFile file) throws IOException {
        TenantBranding b = getOrCreate();
        if (b.getLogoFid() != null) seaweedFs.delete(b.getLogoFid());
        b.setLogoFid(seaweedFs.upload(tid(), "branding", file));
        return toResponse(repo.save(b));
    }

    @Transactional
    public CmsDto.BrandingResponse uploadFavicon(MultipartFile file) throws IOException {
        TenantBranding b = getOrCreate();
        if (b.getFaviconFid() != null) seaweedFs.delete(b.getFaviconFid());
        b.setFaviconFid(seaweedFs.upload(tid(), "branding", file));
        return toResponse(repo.save(b));
    }

    public byte[] downloadLogo() {
        return repo.findByTenantId(tid())
                .map(b -> b.getLogoFid() != null ? seaweedFs.download(b.getLogoFid()) : null)
                .orElse(null);
    }

    private CmsDto.BrandingResponse toResponse(TenantBranding b) {
        CmsDto.BrandingResponse base = mapper.toBrandingResponse(b);
        String logoUrl    = b.getLogoFid()    != null ? filerUrl + b.getLogoFid()    : null;
        String faviconUrl = b.getFaviconFid() != null ? filerUrl + b.getFaviconFid() : null;
        return new CmsDto.BrandingResponse(
                base.id(), base.companyName(), base.tagline(),
                logoUrl, faviconUrl,
                base.primaryColor(), base.secondaryColor(), base.fontFamily(),
                base.customCss(), base.updatedAt()
        );
    }
}
