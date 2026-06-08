package com.erp.sales.api;

import com.erp.sales.dto.*;
import com.erp.sales.service.DevisRequestService;
import com.erp.sales.service.PortalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Customer-facing portal — all endpoints require CLIENT (or higher) role.
 * Each method enforces that the caller only sees their own documents.
 */
@RestController
@RequestMapping("/api/v1/sales/portal")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class PortalController {

    private final PortalService portalService;
    private final DevisRequestService requestService;

    @GetMapping("/devis")
    public List<DevisDto.Summary> myDevis() {
        return portalService.myDevis();
    }

    @GetMapping("/factures")
    public List<FactureDto.Summary> myFactures() {
        return portalService.myFactures();
    }

    @GetMapping("/requests")
    public List<DevisRequestDto.Summary> myRequests() {
        return portalService.myRequests();
    }

    @PostMapping("/requests")
    @ResponseStatus(HttpStatus.CREATED)
    public DevisRequestDto.Response submitRequest(@Valid @RequestBody DevisRequestDto.Create dto) {
        return requestService.submit(dto);
    }

    @GetMapping("/devis/{id}/pdf")
    public ResponseEntity<byte[]> downloadDevisPdf(@PathVariable UUID id) {
        byte[] pdf = portalService.downloadDevisPdf(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header("Content-Disposition", "attachment; filename=\"devis.pdf\"")
                .body(pdf);
    }

    @GetMapping("/factures/{id}/pdf")
    public ResponseEntity<byte[]> downloadFacturePdf(@PathVariable UUID id) {
        byte[] pdf = portalService.downloadFacturePdf(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header("Content-Disposition", "attachment; filename=\"facture.pdf\"")
                .body(pdf);
    }
}
