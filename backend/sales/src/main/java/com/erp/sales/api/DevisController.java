package com.erp.sales.api;

import com.erp.sales.dto.DevisDto;
import com.erp.sales.service.CommandeService;
import com.erp.sales.service.DevisService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sales/devis")
@RequiredArgsConstructor
public class DevisController {

    private final DevisService devisService;
    private final CommandeService commandeService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public Page<DevisDto.Summary> list(Pageable pageable) {
        return devisService.findAll(pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public DevisDto.Response get(@PathVariable UUID id) {
        return devisService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public DevisDto.Response create(@Valid @RequestBody DevisDto.Create dto) {
        return devisService.create(dto);
    }

    @PostMapping("/{id}/lines")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public DevisDto.Response addLine(@PathVariable UUID id, @Valid @RequestBody DevisDto.AddLine dto) {
        return devisService.addLine(id, dto);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("isAuthenticated()")
    public DevisDto.Response transition(@PathVariable UUID id, @Valid @RequestBody DevisDto.Transition dto) {
        DevisDto.Response updated = devisService.transition(id, dto);
        // If devis was just accepted, auto-create the commande
        if (dto.targetStatus().name().equals("ACCEPTE")) {
            commandeService.createFromDevis(id);
        }
        return updated;
    }
}
