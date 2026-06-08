package com.erp.crm.service;

import com.erp.common.audit.AuditAction;
import com.erp.common.audit.Auditable;
import com.erp.common.tenant.TenantContext;
import com.erp.crm.domain.Client;
import com.erp.crm.dto.ClientDto;
import com.erp.crm.mapper.CrmMapper;
import com.erp.crm.repository.ClientRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ClientService {

    private final ClientRepository repo;
    private final CrmMapper mapper;

    public Page<ClientDto.Response> findAll(Pageable pageable) {
        return repo.findAllByTenantIdAndActiveTrue(tenantId(), pageable).map(mapper::toResponse);
    }

    public ClientDto.Response findById(UUID id) {
        return mapper.toResponse(get(id));
    }

    @Transactional
    @Auditable(action = AuditAction.CREATE, entityType = "Client")
    public ClientDto.Response create(ClientDto.CreateRequest req) {
        Client c = mapper.toEntity(req);
        c.setTenantId(tenantId());
        return mapper.toResponse(repo.save(c));
    }

    @Transactional
    @Auditable(action = AuditAction.UPDATE, entityType = "Client")
    public ClientDto.Response update(UUID id, ClientDto.UpdateRequest req) {
        Client c = get(id);
        mapper.updateEntity(req, c);
        return mapper.toResponse(repo.save(c));
    }

    private Client get(UUID id) {
        return repo.findByIdAndTenantId(id, tenantId())
            .orElseThrow(() -> new EntityNotFoundException("Client not found: " + id));
    }

    private UUID tenantId() { return UUID.fromString(TenantContext.requireTenant()); }
}
