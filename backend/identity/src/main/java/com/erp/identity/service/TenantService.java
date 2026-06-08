package com.erp.identity.service;

import com.erp.common.audit.AuditAction;
import com.erp.common.audit.Auditable;
import com.erp.identity.domain.Tenant;
import com.erp.identity.dto.TenantDto;
import com.erp.identity.mapper.TenantMapper;
import com.erp.identity.repository.TenantRepository;
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
public class TenantService {

    private final TenantRepository tenantRepository;
    private final TenantMapper     tenantMapper;

    public Page<TenantDto.Response> findAll(Pageable pageable) {
        return tenantRepository.findAll(pageable).map(tenantMapper::toResponse);
    }

    public TenantDto.Response findById(UUID id) {
        return tenantMapper.toResponse(getOrThrow(id));
    }

    public TenantDto.Response findBySlug(String slug) {
        return tenantRepository.findBySlug(slug)
            .map(tenantMapper::toResponse)
            .orElseThrow(() -> new EntityNotFoundException("Tenant not found: " + slug));
    }

    @Transactional
    @Auditable(action = AuditAction.CREATE, entityType = "Tenant")
    public TenantDto.Response create(TenantDto.Request request) {
        if (tenantRepository.existsBySlug(request.slug())) {
            throw new IllegalArgumentException("Slug already taken: " + request.slug());
        }
        Tenant tenant = Tenant.builder()
            .slug(request.slug())
            .name(request.name())
            .build();
        return tenantMapper.toResponse(tenantRepository.save(tenant));
    }

    @Transactional
    @Auditable(action = AuditAction.UPDATE, entityType = "Tenant")
    public TenantDto.Response setActive(UUID id, boolean active) {
        Tenant tenant = getOrThrow(id);
        tenant.setActive(active);
        return tenantMapper.toResponse(tenantRepository.save(tenant));
    }

    private Tenant getOrThrow(UUID id) {
        return tenantRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Tenant not found: " + id));
    }
}
