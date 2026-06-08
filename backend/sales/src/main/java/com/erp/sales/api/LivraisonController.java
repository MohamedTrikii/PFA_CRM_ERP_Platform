package com.erp.sales.api;

import com.erp.sales.dto.LivraisonDto;
import com.erp.sales.service.LivraisonService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sales/livraisons")
@RequiredArgsConstructor
public class LivraisonController {

    private final LivraisonService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public Page<LivraisonDto.Summary> list(Pageable pageable) {
        return service.findAll(pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public LivraisonDto.Response get(@PathVariable UUID id) {
        return service.findById(id);
    }

    @GetMapping("/by-commande/{commandeId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public List<LivraisonDto.Summary> byCommande(@PathVariable UUID commandeId) {
        return service.findByCommande(commandeId);
    }

    @PatchMapping("/{id}/deliver")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public LivraisonDto.Response deliver(@PathVariable UUID id, @Valid @RequestBody LivraisonDto.Deliver dto) {
        return service.deliver(id, dto);
    }

    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public LivraisonDto.Response confirm(@PathVariable UUID id) {
        return service.confirm(id);
    }
}
