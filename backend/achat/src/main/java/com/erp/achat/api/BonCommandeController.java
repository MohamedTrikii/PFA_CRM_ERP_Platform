package com.erp.achat.api;

import com.erp.achat.domain.BonCommandeStatus;
import com.erp.achat.dto.AchatDto;
import com.erp.achat.service.BonCommandeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/achats/bons-commande")
@RequiredArgsConstructor
public class BonCommandeController {

    private final BonCommandeService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public Page<AchatDto.BonCommandeSummary> list(
            @RequestParam(required = false) BonCommandeStatus status,
            Pageable pageable) {
        if (status != null) return service.listByStatus(status, pageable);
        return service.list(pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public AchatDto.BonCommandeResponse getById(@PathVariable UUID id) {
        return service.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public AchatDto.BonCommandeResponse create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AchatDto.BonCommandeCreateRequest req) {
        UUID createdBy = UUID.fromString(jwt.getSubject());
        return service.create(createdBy, req);
    }

    @PatchMapping("/{id}/transition")
    @PreAuthorize("isAuthenticated()")
    public AchatDto.BonCommandeResponse transition(
            @PathVariable UUID id,
            @Valid @RequestBody AchatDto.BonCommandeTransitionRequest req) {
        return service.transition(id, req.targetStatus());
    }
}
