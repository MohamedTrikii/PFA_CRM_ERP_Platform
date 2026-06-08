package com.erp.crm.service;

import com.erp.common.audit.AuditAction;
import com.erp.common.audit.Auditable;
import com.erp.common.tenant.TenantContext;
import com.erp.crm.domain.Opportunity;
import com.erp.crm.domain.OpportunityStatus;
import com.erp.crm.dto.OpportunityDto;
import com.erp.crm.mapper.CrmMapper;
import com.erp.crm.repository.OpportunityRepository;
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
public class OpportunityService {

    private final OpportunityRepository repo;
    private final CrmMapper mapper;

    public Page<OpportunityDto.Response> findAll(Pageable pageable) {
        return repo.findAllByTenantId(tenantId(), pageable).map(mapper::toResponse);
    }

    public OpportunityDto.Response findById(UUID id) {
        return mapper.toResponse(get(id));
    }

    @Transactional
    @Auditable(action = AuditAction.CREATE, entityType = "Opportunity")
    public OpportunityDto.Response create(OpportunityDto.CreateRequest req) {
        Opportunity o = mapper.toEntity(req);
        o.setTenantId(tenantId());
        return mapper.toResponse(repo.save(o));
    }

    @Transactional
    @Auditable(action = AuditAction.UPDATE, entityType = "Opportunity")
    public OpportunityDto.Response update(UUID id, OpportunityDto.UpdateRequest req) {
        Opportunity o = get(id);
        mapper.updateEntity(req, o);
        return mapper.toResponse(repo.save(o));
    }

    @Transactional
    @Auditable(action = AuditAction.UPDATE, entityType = "Opportunity")
    public OpportunityDto.Response transition(UUID id, OpportunityStatus status) {
        Opportunity o = get(id);
        o.setStatus(status);
        return mapper.toResponse(repo.save(o));
    }

    private Opportunity get(UUID id) {
        return repo.findByIdAndTenantId(id, tenantId())
            .orElseThrow(() -> new EntityNotFoundException("Opportunity not found: " + id));
    }

    private UUID tenantId() { return UUID.fromString(TenantContext.requireTenant()); }
}
