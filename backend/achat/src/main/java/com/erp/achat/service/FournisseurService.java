package com.erp.achat.service;

import com.erp.achat.dto.AchatDto;
import com.erp.achat.domain.Fournisseur;
import com.erp.achat.mapper.AchatMapper;
import com.erp.achat.repository.FournisseurRepository;
import com.erp.common.exception.ConflictException;
import com.erp.common.exception.ResourceNotFoundException;
import com.erp.common.tenant.TenantUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@SuppressWarnings("null")
public class FournisseurService {

    private final FournisseurRepository repo;
    private final AchatMapper mapper;

    private static UUID tid() { return TenantUtils.safeTenantUuid(); }

    public Page<AchatDto.FournisseurResponse> list(Pageable pageable) {
        return repo.findAllByTenant(tid(), pageable).map(mapper::toFournisseurResponse);
    }

    public Page<AchatDto.FournisseurResponse> listActive(Pageable pageable) {
        return repo.findActiveByTenant(tid(), pageable).map(mapper::toFournisseurResponse);
    }

    public AchatDto.FournisseurResponse getById(UUID id) {
        return mapper.toFournisseurResponse(find(id));
    }

    @Transactional
    public AchatDto.FournisseurResponse create(AchatDto.FournisseurCreateRequest req) {
        if (repo.existsByTenantAndCode(tid(), req.code())) {
            throw new ConflictException("Fournisseur code already exists: " + req.code());
        }
        Fournisseur f = mapper.toEntity(req);
        f.setTenantId(tid());
        return mapper.toFournisseurResponse(Objects.requireNonNull(repo.save(f)));
    }

    @Transactional
    public AchatDto.FournisseurResponse update(UUID id, AchatDto.FournisseurUpdateRequest req) {
        Fournisseur f = find(id);
        mapper.updateEntity(req, f);
        return mapper.toFournisseurResponse(repo.save(f));
    }

    @Transactional
    public void delete(UUID id) {
        Fournisseur f = find(id);
        f.setActif(false);
        repo.save(f);
    }

    private Fournisseur find(UUID id) {
        return repo.findByTenantAndId(tid(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Fournisseur not found: " + id));
    }
}
