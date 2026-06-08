package com.erp.achat.api;

import com.erp.achat.dto.AchatDto;
import com.erp.achat.service.BonReceptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/achats/bons-reception")
@RequiredArgsConstructor
public class BonReceptionController {

    private final BonReceptionService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public Page<AchatDto.BonReceptionSummary> list(Pageable pageable) {
        return service.list(pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public AchatDto.BonReceptionResponse getById(@PathVariable UUID id) {
        return service.getById(id);
    }

    @GetMapping("/by-bon-commande/{bcId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public List<AchatDto.BonReceptionSummary> listByBonCommande(@PathVariable UUID bcId) {
        return service.listByBonCommande(bcId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public AchatDto.BonReceptionResponse create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AchatDto.BonReceptionCreateRequest req) {
        UUID createdBy = UUID.fromString(jwt.getSubject());
        return service.create(createdBy, req);
    }

    @PatchMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public AchatDto.BonReceptionResponse confirm(@PathVariable UUID id) {
        return service.confirm(id);
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public AchatDto.BonReceptionResponse cancel(@PathVariable UUID id) {
        return service.cancel(id);
    }
}
