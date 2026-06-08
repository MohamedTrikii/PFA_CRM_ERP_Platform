package com.erp.identity.api;

import com.erp.identity.dto.TenantDto;
import com.erp.identity.service.TenantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/identity/tenants")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")   // entire controller: SUPER_ADMIN only
public class TenantController {

    private final TenantService tenantService;

    @GetMapping
    public Page<TenantDto.Response> list(@PageableDefault(size = 20) Pageable pageable) {
        return tenantService.findAll(pageable);
    }

    @GetMapping("/{id}")
    public TenantDto.Response getById(@PathVariable UUID id) {
        return tenantService.findById(id);
    }

    @GetMapping("/by-slug/{slug}")
    public TenantDto.Response getBySlug(@PathVariable String slug) {
        return tenantService.findBySlug(slug);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TenantDto.Response create(@Valid @RequestBody TenantDto.Request request) {
        return tenantService.create(request);
    }

    @PatchMapping("/{id}/activate")
    public TenantDto.Response activate(@PathVariable UUID id) {
        return tenantService.setActive(id, true);
    }

    @PatchMapping("/{id}/deactivate")
    public TenantDto.Response deactivate(@PathVariable UUID id) {
        return tenantService.setActive(id, false);
    }
}
