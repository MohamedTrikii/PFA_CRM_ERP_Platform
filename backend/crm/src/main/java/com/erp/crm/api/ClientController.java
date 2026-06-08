package com.erp.crm.api;

import com.erp.crm.dto.ClientDto;
import com.erp.crm.service.ClientService;
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
@RequestMapping("/api/v1/crm/clients")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
public class ClientController {

    private final ClientService service;

    @GetMapping
    public Page<ClientDto.Response> list(@PageableDefault(size = 20) Pageable p) {
        return service.findAll(p);
    }

    @GetMapping("/{id}")
    public ClientDto.Response get(@PathVariable UUID id) { return service.findById(id); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClientDto.Response create(@Valid @RequestBody ClientDto.CreateRequest req) {
        return service.create(req);
    }

    @PutMapping("/{id}")
    public ClientDto.Response update(@PathVariable UUID id,
                                     @Valid @RequestBody ClientDto.UpdateRequest req) {
        return service.update(id, req);
    }
}
