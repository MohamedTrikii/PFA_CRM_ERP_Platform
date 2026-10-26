package com.erp.sales.service;

import com.erp.common.audit.Auditable;
import com.erp.common.audit.AuditAction;
import com.erp.sales.domain.*;
import com.erp.sales.dto.*;
import com.erp.sales.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DevisRequestService {

    private final DevisRequestRepository requestRepo;
    private final DevisAttachmentRepository attachmentRepo;
    private final DevisRepository devisRepo;

    public Page<DevisRequestDto.Summary> findAll(Pageable pageable) {
        return requestRepo.findAllByTenant(tid(), pageable).map(this::toSummary);
    }

    public List<DevisRequestDto.Summary> findByStatus(DevisRequestStatus status) {
        return requestRepo.findByTenantAndStatus(tid(), status)
                .stream().map(this::toSummary).toList();
    }

    public DevisRequestDto.Response findById(UUID id) {
        return toResponse(load(id));
    }

    /**
     * Submitted by a CLIENT (unauthenticated portal or authenticated CLIENT role).
     */
    @Transactional
    @Auditable(action = AuditAction.CREATE, entityType = "DevisRequest")
    public DevisRequestDto.Response submit(DevisRequestDto.Create dto) {
        DevisRequest req = new DevisRequest();
        req.setClientName(dto.clientName());
        req.setClientEmail(dto.clientEmail());
        req.setClientPhone(dto.clientPhone());
        req.setClientAddress(dto.clientAddress());
        req.setProjectType(dto.projectType());
        req.setDescription(dto.description());
        req.setStatus(DevisRequestStatus.NOUVEAU);

        List<DevisRequestItem> itemList = new java.util.ArrayList<>();
        short pos = 0;
        for (DevisRequestDto.ItemRequest ir : dto.items()) {
            itemList.add(buildItem(req, ir, pos++));
        }
        req.setItems(itemList);

        return toResponse(requestRepo.save(req));
    }

    /**
     * Employee assigns notes and changes status (EN_ETUDE → DEVIS_CREE / REFUSE).
     */
    @Transactional
    @Auditable(action = AuditAction.UPDATE, entityType = "DevisRequest")
    public DevisRequestDto.Response updateStatus(UUID id, DevisRequestDto.AddNote dto) {
        DevisRequest req = load(id);
        if (dto.status() != null && !req.getStatus().canTransitionTo(dto.status())) {
            throw new IllegalStateException(
                    "Cannot transition from " + req.getStatus() + " to " + dto.status());
        }
        if (dto.notes() != null) req.setNotes(dto.notes());
        if (dto.status() != null) req.setStatus(dto.status());
        return toResponse(requestRepo.save(req));
    }

    /**
     * Converts a quote request into a formal Devis, then marks the request as DEVIS_CREE.
     * The caller (DevisService.create) should be invoked separately — this method links
     * the result back to the request.
     */
    @Transactional
    @Auditable(action = AuditAction.UPDATE, entityType = "DevisRequest")
    public DevisRequestDto.Response linkDevis(UUID requestId, UUID devisId) {
        DevisRequest req = load(requestId);
        if (!devisRepo.findByTenantAndId(tid(), devisId).isPresent()) {
            throw new EntityNotFoundException("Devis not found: " + devisId);
        }
        req.setConvertedDevisId(devisId);
        req.setStatus(DevisRequestStatus.DEVIS_CREE);
        return toResponse(requestRepo.save(req));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private DevisRequestItem buildItem(DevisRequest req, DevisRequestDto.ItemRequest ir, short pos) {
        DevisRequestItem item = new DevisRequestItem();
        item.setRequest(req);
        item.setQuantity(ir.quantity());
        item.setWidthMm(ir.widthMm());
        item.setHeightMm(ir.heightMm());
        item.setProfileSeries(ir.profileSeries());
        item.setOpeningType(ir.openingType());
        item.setGlassType(ir.glassType());
        item.setColor(ir.color());
        item.setAccessories(ir.accessories());
        item.setNotes(ir.notes());
        item.setPosition(pos);
        return item;
    }

    private DevisRequestDto.Summary toSummary(DevisRequest r) {
        return new DevisRequestDto.Summary(
                r.getId(), r.getClientName(), r.getClientEmail(),
                r.getProjectType(), r.getStatus(), r.getConvertedDevisId(),
                r.getItems().size(), r.getCreatedAt());
    }

    private DevisRequestDto.Response toResponse(DevisRequest r) {
        List<DevisRequestDto.ItemResponse> items = r.getItems().stream()
                .map(i -> new DevisRequestDto.ItemResponse(
                        i.getId(), i.getQuantity(), i.getWidthMm(), i.getHeightMm(),
                        i.getProfileSeries(), i.getOpeningType(), i.getGlassType(),
                        i.getColor(), i.getAccessories(), i.getNotes()))
                .toList();

        List<AttachmentDto.Response> attachments = attachmentRepo
                .findByEntity(r.getTenantId(), "DEVIS_REQUEST", r.getId())
                .stream().map(a -> new AttachmentDto.Response(
                        a.getId(), a.getEntityType(), a.getEntityId(),
                        a.getFileName(), a.getContentType(), a.getFileSize(), a.getCreatedAt()))
                .toList();

        return new DevisRequestDto.Response(
                r.getId(), r.getClientId(), r.getClientName(), r.getClientEmail(),
                r.getClientPhone(), r.getClientAddress(), r.getProjectType(),
                r.getDescription(), r.getStatus(), r.getConvertedDevisId(),
                r.getNotes(), items, attachments, r.getCreatedAt(), r.getUpdatedAt());
    }

    private DevisRequest load(UUID id) {
        return requestRepo.findByTenantAndIdWithItems(tid(), id)
                .orElseThrow(() -> new EntityNotFoundException("DevisRequest not found: " + id));
    }

    private static UUID tid() {
        return com.erp.common.tenant.TenantUtils.safeTenantUuid();
    }
}
