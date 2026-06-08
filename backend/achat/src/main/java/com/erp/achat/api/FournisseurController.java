package com.erp.achat.api;

import com.erp.achat.dto.AchatDto;
import com.erp.achat.service.FournisseurService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/achats/fournisseurs")
@RequiredArgsConstructor
public class FournisseurController {

    private final FournisseurService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public Page<AchatDto.FournisseurResponse> list(Pageable pageable) {
        return service.list(pageable);
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public Page<AchatDto.FournisseurResponse> listActive(Pageable pageable) {
        return service.listActive(pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public AchatDto.FournisseurResponse getById(@PathVariable UUID id) {
        return service.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public AchatDto.FournisseurResponse create(@Valid @RequestBody AchatDto.FournisseurCreateRequest req) {
        return service.create(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public AchatDto.FournisseurResponse update(
            @PathVariable UUID id,
            @Valid @RequestBody AchatDto.FournisseurUpdateRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
