package com.erp.crm.service;

import com.erp.common.audit.AuditAction;
import com.erp.common.audit.Auditable;
import com.erp.common.tenant.TenantContext;
import com.erp.crm.domain.Prospect;
import com.erp.crm.domain.ProspectStatus;
import com.erp.crm.dto.ProspectDto;
import com.erp.crm.mapper.CrmMapper;
import com.erp.crm.repository.ProspectRepository;
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
public class ProspectService {

    private final ProspectRepository repo;
    private final CrmMapper mapper;

    public Page<ProspectDto.Response> findAll(Pageable pageable) {
        return repo.findAllByTenantId(tenantId(), pageable).map(mapper::toResponse);
    }

    public ProspectDto.Response findById(UUID id) {
        return mapper.toResponse(get(id));
    }

    @Transactional
    @Auditable(action = AuditAction.CREATE, entityType = "Prospect")
    public ProspectDto.Response create(ProspectDto.CreateRequest req) {
        Prospect p = mapper.toEntity(req);
        p.setTenantId(tenantId());
        return mapper.toResponse(repo.save(p));
    }

    @Transactional
    @Auditable(action = AuditAction.UPDATE, entityType = "Prospect")
    public ProspectDto.Response update(UUID id, ProspectDto.UpdateRequest req) {
        Prospect p = get(id);
        mapper.updateEntity(req, p);
        return mapper.toResponse(repo.save(p));
    }

    @Transactional
    @Auditable(action = AuditAction.UPDATE, entityType = "Prospect")
    public ProspectDto.Response changeStatus(UUID id, ProspectStatus status) {
        Prospect p = get(id);
        p.setStatus(status);
        return mapper.toResponse(repo.save(p));
    }

    private Prospect get(UUID id) {
        return repo.findByIdAndTenantId(id, tenantId())
            .orElseThrow(() -> new EntityNotFoundException("Prospect not found: " + id));
    }

    private UUID tenantId() { return UUID.fromString(TenantContext.requireTenant()); }
}
