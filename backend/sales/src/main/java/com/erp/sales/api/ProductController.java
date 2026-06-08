package com.erp.sales.api;

import com.erp.common.tenant.TenantContext;
import com.erp.sales.dto.ProductDto;
import com.erp.sales.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sales/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public Page<ProductDto.Response> list(Pageable pageable) {
        return service.findAll(pageable);
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE','CLIENT')")
    public List<ProductDto.Response> listActive() {
        return service.findAllActive();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public ProductDto.Response get(@PathVariable UUID id) {
        return service.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public ProductDto.Response create(@Valid @RequestBody ProductDto.Create dto,
                                      Authentication auth) {
        if (dto.tenantId() != null && isSuperAdmin(auth)) {
            TenantContext.set(dto.tenantId().toString());
        }
        return service.create(dto);
    }

    private static boolean isSuperAdmin(Authentication auth) {
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public ProductDto.Response update(@PathVariable UUID id, @Valid @RequestBody ProductDto.Update dto) {
        return service.update(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public void deactivate(@PathVariable UUID id) {
        service.deactivate(id);
    }
}
