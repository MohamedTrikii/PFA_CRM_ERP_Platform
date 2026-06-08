package com.erp.sales.api;

import com.erp.sales.domain.DevisRequestStatus;
import com.erp.sales.dto.DevisRequestDto;
import com.erp.sales.service.DevisRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sales/requests")
@RequiredArgsConstructor
public class DevisRequestController {

    private final DevisRequestService service;

    /** Paginated list for employees / admin */
    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public Page<DevisRequestDto.Summary> list(Pageable pageable) {
        return service.findAll(pageable);
    }

    /** Filter by status */
    @GetMapping("/by-status/{status}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public List<DevisRequestDto.Summary> byStatus(@PathVariable DevisRequestStatus status) {
        return service.findByStatus(status);
    }

    /** Detail view */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public DevisRequestDto.Response get(@PathVariable UUID id) {
        return service.findById(id);
    }

    /**
     * PUBLIC endpoint — no auth required — a prospect/client submits via the
     * public quote-request form.  The gateway permits this path without JWT.
     */
    @PostMapping("/public")
    @ResponseStatus(HttpStatus.CREATED)
    public DevisRequestDto.Response submitPublic(@Valid @RequestBody DevisRequestDto.Create dto) {
        return service.submit(dto);
    }

    /** Authenticated CLIENT submitting via the portal */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('CLIENT','EMPLOYER','EMPLOYEE','SUPER_ADMIN')")
    public DevisRequestDto.Response submit(@Valid @RequestBody DevisRequestDto.Create dto) {
        return service.submit(dto);
    }

    /** Employee updates status / adds internal notes */
    @PatchMapping("/{id}/status")
    @PreAuthorize("isAuthenticated()")
    public DevisRequestDto.Response updateStatus(@PathVariable UUID id,
                                                  @Valid @RequestBody DevisRequestDto.AddNote dto) {
        return service.updateStatus(id, dto);
    }

    /** Link a newly created Devis back to this request */
    @PostMapping("/{id}/link-devis/{devisId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public DevisRequestDto.Response linkDevis(@PathVariable UUID id,
                                               @PathVariable UUID devisId) {
        return service.linkDevis(id, devisId);
    }
}
