package com.erp.crm.api;

import com.erp.common.tenant.TenantContext;
import com.erp.crm.domain.ProspectStatus;
import com.erp.crm.dto.ProspectDto;
import com.erp.crm.service.ProspectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/crm/prospects")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
public class ProspectController {

    private final ProspectService service;

    @GetMapping
    public Page<ProspectDto.Response> list(@PageableDefault(size = 20) Pageable p) {
        return service.findAll(p);
    }

    @GetMapping("/{id}")
    public ProspectDto.Response get(@PathVariable UUID id) { return service.findById(id); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProspectDto.Response create(@Valid @RequestBody ProspectDto.CreateRequest req,
                                       Authentication auth) {
        if (req.tenantId() != null && isSuperAdmin(auth)) {
            TenantContext.set(req.tenantId().toString());
        }
        return service.create(req);
    }

    private static boolean isSuperAdmin(Authentication auth) {
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()));
    }

    @PutMapping("/{id}")
    public ProspectDto.Response update(@PathVariable UUID id,
                                       @Valid @RequestBody ProspectDto.UpdateRequest req) {
        return service.update(id, req);
    }

    @PatchMapping("/{id}/status")
    public ProspectDto.Response changeStatus(@PathVariable UUID id,
                                              @RequestParam ProspectStatus status) {
        return service.changeStatus(id, status);
    }
}
