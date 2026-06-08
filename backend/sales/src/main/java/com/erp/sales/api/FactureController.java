package com.erp.sales.api;

import com.erp.sales.dto.FactureDto;
import com.erp.sales.service.FactureService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sales/factures")
@RequiredArgsConstructor
public class FactureController {

    private final FactureService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public Page<FactureDto.Summary> list(Pageable pageable) {
        return service.findAll(pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public FactureDto.Response get(@PathVariable UUID id) {
        return service.findById(id);
    }

    @PostMapping("/from-commande/{commandeId}")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public FactureDto.Response createFromCommande(@PathVariable UUID commandeId) {
        return service.createFromCommande(commandeId);
    }

    @PostMapping("/{id}/encaisser")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public FactureDto.Response encaisser(@PathVariable UUID id, @Valid @RequestBody FactureDto.Encaisser dto) {
        return service.encaisser(id, dto);
    }
}
