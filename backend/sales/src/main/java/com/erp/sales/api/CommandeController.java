package com.erp.sales.api;

import com.erp.sales.dto.CommandeDto;
import com.erp.sales.service.CommandeService;
import com.erp.sales.service.FactureService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sales/commandes")
@RequiredArgsConstructor
public class CommandeController {

    private final CommandeService commandeService;
    private final FactureService factureService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public Page<CommandeDto.Response> list(Pageable pageable) {
        return commandeService.findAll(pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public CommandeDto.Response get(@PathVariable UUID id) {
        return commandeService.findById(id);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public CommandeDto.Response transition(@PathVariable UUID id, @Valid @RequestBody CommandeDto.Transition dto) {
        CommandeDto.Response updated = commandeService.transition(id, dto);
        // Auto-create facture when commande is confirmed
        if (dto.targetStatus().name().equals("CONFIRMEE")) {
            factureService.createFromCommande(id);
        }
        return updated;
    }

    @PatchMapping("/{id}/delivery")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public CommandeDto.Response updateDelivery(@PathVariable UUID id,
                                               @RequestBody CommandeDto.UpdateDelivery dto) {
        return commandeService.updateDelivery(id, dto);
    }
}
