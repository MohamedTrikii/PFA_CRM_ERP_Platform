package com.erp.cms.api;

import com.erp.common.tenant.TenantContext;
import com.erp.cms.dto.CmsDto;
import com.erp.cms.service.BrandingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cms/branding")
@RequiredArgsConstructor
public class BrandingController {

    private final BrandingService brandingService;

    // ── Authenticated branding ─────────────────────────────────────────────────

    @GetMapping
    public CmsDto.BrandingResponse get(@RequestParam(required = false) UUID tenantId,
                                       Authentication auth) {
        if (tenantId != null) {
            if (!isSuperAdmin(auth)) {
                throw new org.springframework.security.access.AccessDeniedException(
                    "Only SUPER_ADMIN may query another tenant's branding");
            }
            TenantContext.set(tenantId.toString());
        }
        return brandingService.get();
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public CmsDto.BrandingResponse update(@Valid @RequestBody CmsDto.BrandingUpdateRequest req,
                                          Authentication auth) {
        if (req.tenantId() != null && isSuperAdmin(auth)) {
            TenantContext.set(req.tenantId().toString());
        }
        return brandingService.update(req);
    }

    @PostMapping(value = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public CmsDto.BrandingResponse uploadLogo(@RequestParam("file") MultipartFile file)
            throws IOException {
        return brandingService.uploadLogo(file);
    }

    @PostMapping(value = "/favicon", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public CmsDto.BrandingResponse uploadFavicon(@RequestParam("file") MultipartFile file)
            throws IOException {
        return brandingService.uploadFavicon(file);
    }

    @GetMapping("/logo")
    public ResponseEntity<byte[]> getLogo() {
        byte[] data = brandingService.downloadLogo();
        if (data == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .body(data);
    }

    // ── Gallery management ─────────────────────────────────────────────────────

    @PostMapping(value = "/gallery", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public CmsDto.BrandingResponse uploadGalleryImage(
            @RequestParam("file")               MultipartFile file,
            @RequestParam(value = "caption", defaultValue = "") String caption,
            @RequestParam(value = "alt",     defaultValue = "") String alt)
            throws IOException {
        return brandingService.uploadGalleryImage(file, caption, alt);
    }

    @DeleteMapping("/gallery")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public CmsDto.BrandingResponse deleteGalleryImage(@RequestParam("fid") String fid)
            throws IOException {
        return brandingService.deleteGalleryImage(fid);
    }

    // ── Public (unauthenticated) branding lookup ───────────────────────────────

    @GetMapping("/public")
    public ResponseEntity<?> getPublic(@RequestParam UUID tenantId) {
        TenantContext.set(tenantId.toString());
        return ResponseEntity.ok(brandingService.getPublic(tenantId));
    }

    // ── Internal helpers ───────────────────────────────────────────────────────

    private static boolean isSuperAdmin(Authentication auth) {
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()));
    }
}
