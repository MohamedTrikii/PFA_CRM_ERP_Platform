package com.erp.crm.api;

import com.erp.crm.domain.OpportunityStatus;
import com.erp.crm.dto.OpportunityDto;
import com.erp.crm.service.OpportunityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/crm/opportunities")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
public class OpportunityController {

    private final OpportunityService service;

    @GetMapping
    public Page<OpportunityDto.Response> list(@PageableDefault(size = 20) Pageable p) {
        return service.findAll(p);
    }

    @GetMapping("/{id}")
    public OpportunityDto.Response get(@PathVariable UUID id) { return service.findById(id); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OpportunityDto.Response create(@Valid @RequestBody OpportunityDto.CreateRequest req) {
        return service.create(req);
    }

    @PutMapping("/{id}")
    public OpportunityDto.Response update(@PathVariable UUID id,
                                          @Valid @RequestBody OpportunityDto.UpdateRequest req) {
        return service.update(id, req);
    }

    @PatchMapping("/{id}/status")
    public OpportunityDto.Response transition(@PathVariable UUID id,
                                              @RequestParam OpportunityStatus status) {
        return service.transition(id, status);
    }
}
