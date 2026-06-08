package com.erp.cms.service;

import com.erp.cms.domain.TenantNotice;
import com.erp.cms.dto.CmsDto;
import com.erp.cms.mapper.CmsMapper;
import com.erp.cms.repository.TenantNoticeRepository;
import com.erp.common.exception.ResourceNotFoundException;
import com.erp.common.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NoticeService {

    private final TenantNoticeRepository repo;
    private final CmsMapper              mapper;
    private final com.erp.cms.factory.NoticeFactory noticeFactory;

    private static UUID tid() { return UUID.fromString(TenantContext.requireTenant()); }

    public List<CmsDto.NoticeResponse> listAll() {
        return mapper.toNoticeResponseList(repo.findAllByTenant(tid()));
    }

    public List<CmsDto.NoticeResponse> listActive() {
        return mapper.toNoticeResponseList(repo.findActiveByTenant(tid(), Instant.now()));
    }

    @Transactional
    public CmsDto.NoticeResponse create(CmsDto.NoticeCreateRequest req) {
        TenantNotice n = noticeFactory.create(req.title(), req.body(), tid());
        n.setSeverity(req.severity() != null ? req.severity() : com.erp.cms.domain.NoticeSeverity.INFO);
        n.setStartsAt(req.startsAt());
        n.setEndsAt(req.endsAt());
        return mapper.toNoticeResponse(repo.save(n));
    }

    @Transactional
    public CmsDto.NoticeResponse update(UUID id, CmsDto.NoticeUpdateRequest req) {
        TenantNotice n = find(id);
        mapper.updateNotice(req, n);
        return mapper.toNoticeResponse(repo.save(n));
    }

    @Transactional
    public void delete(UUID id) {
        repo.delete(find(id));
    }

    private TenantNotice find(UUID id) {
        return repo.findByTenantAndId(tid(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Notice not found: " + id));
    }
}
