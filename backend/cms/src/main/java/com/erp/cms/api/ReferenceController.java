package com.erp.cms.api;

import com.erp.cms.dto.CmsDto;
import com.erp.cms.service.ReferenceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cms/references")
@RequiredArgsConstructor
public class ReferenceController {

    private final ReferenceService svc;

    // ── Categories (read: any authenticated; write: SUPER_ADMIN) ─────────────

    @GetMapping("/categories")
    public List<CmsDto.RefCategoryResponse> listCategories() {
        return svc.listCategories();
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public CmsDto.RefCategoryResponse createCategory(@Valid @RequestBody CmsDto.RefCategoryCreateRequest req) {
        return svc.createCategory(req);
    }

    @PutMapping("/categories/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public CmsDto.RefCategoryResponse updateCategory(@PathVariable UUID id,
                                                     @Valid @RequestBody CmsDto.RefCategoryCreateRequest req) {
        return svc.updateCategory(id, req);
    }

    @DeleteMapping("/categories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public void deleteCategory(@PathVariable UUID id) {
        svc.deleteCategory(id);
    }

    // ── Values by category ID (admin use, includes inactive) ─────────────────

    @GetMapping("/categories/{id}/values")
    public List<CmsDto.RefValueResponse> listValuesByCategoryId(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "false") boolean activeOnly) {
        return svc.listValues(id, activeOnly);
    }

    // ── Values by category CODE (public: used by Angular forms) ──────────────

    @GetMapping("/values/{categoryCode}")
    public List<CmsDto.RefValueResponse> listValuesByCategoryCode(
            @PathVariable String categoryCode,
            @RequestParam(defaultValue = "true") boolean activeOnly) {
        return svc.listValuesByCode(categoryCode, activeOnly);
    }

    // ── Value CRUD (SUPER_ADMIN or EMPLOYER) ──────────────────────────────────

    @PostMapping("/categories/{categoryId}/values")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'EMPLOYER')")
    public CmsDto.RefValueResponse createValue(@PathVariable UUID categoryId,
                                               @Valid @RequestBody CmsDto.RefValueCreateRequest req) {
        return svc.createValue(categoryId, req);
    }

    @PutMapping("/values/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'EMPLOYER')")
    public CmsDto.RefValueResponse updateValue(@PathVariable UUID id,
                                               @Valid @RequestBody CmsDto.RefValueUpdateRequest req) {
        return svc.updateValue(id, req);
    }

    @PatchMapping("/values/{id}/toggle")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'EMPLOYER')")
    public CmsDto.RefValueResponse toggleValue(@PathVariable UUID id) {
        return svc.toggleValue(id);
    }

    @DeleteMapping("/values/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'EMPLOYER')")
    public void deleteValue(@PathVariable UUID id) {
        svc.deleteValue(id);
    }

    @PatchMapping("/categories/{categoryId}/values/reorder")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'EMPLOYER')")
    public void reorderValues(@PathVariable UUID categoryId,
                              @RequestBody CmsDto.ReorderRequest req) {
        svc.reorderValues(categoryId, req);
    }
}
