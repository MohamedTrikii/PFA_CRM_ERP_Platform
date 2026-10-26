package com.erp.sales.service;

import com.erp.common.audit.Auditable;
import com.erp.common.audit.AuditAction;
import com.erp.common.event.LivraisonConfirmedEvent;
// removed unused TenantContext import
import com.erp.sales.domain.*;
import com.erp.sales.dto.LivraisonDto;
import com.erp.sales.mapper.SalesMapper;
import com.erp.sales.messaging.SalesEventPublisher;
import com.erp.sales.repository.LivraisonRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LivraisonService {

    private final LivraisonRepository livraisonRepo;
    private final SalesEventPublisher eventPublisher;
    private final SalesMapper mapper;

    public Page<LivraisonDto.Summary> findAll(Pageable pageable) {
        return livraisonRepo.findAllByTenant(tid(), pageable).map(mapper::toLivraisonSummary);
    }

    public LivraisonDto.Response findById(UUID id) {
        return mapper.toLivraisonResponse(loadWithLines(id));
    }

    public List<LivraisonDto.Summary> findByCommande(UUID commandeId) {
        return livraisonRepo.findByTenantAndCommande(tid(), commandeId)
                .stream().map(mapper::toLivraisonSummary).toList();
    }

    /**
     * Records quantities delivered for each line and transitions status.
     * If all lines are fully delivered and targetStatus = LIVREE,
     * publishes LivraisonConfirmedEvent so inventory can record SORTIE movements.
     */
    @Transactional
    @Auditable(action = AuditAction.UPDATE, entityType = "Livraison")
    public LivraisonDto.Response deliver(UUID id, LivraisonDto.Deliver dto) {
        Livraison livraison = loadWithLines(id);

        if (!livraison.getStatus().canTransitionTo(LivraisonStatus.EN_COURS)) {
            throw new IllegalStateException("Livraison cannot be started from status: " + livraison.getStatus());
        }

        if (dto.deliveryDate() != null) livraison.setDeliveryDate(dto.deliveryDate());

        if (dto.lines() != null) {
            for (LivraisonDto.DeliverLine dl : dto.lines()) {
                LivraisonLine line = livraison.getLines().stream()
                        .filter(l -> l.getId().equals(dl.lineId()))
                        .findFirst()
                        .orElseThrow(() -> new EntityNotFoundException("LivraisonLine not found: " + dl.lineId()));
                line.setQuantityDelivered(dl.quantityDelivered());
            }
        }

        livraison.setStatus(LivraisonStatus.EN_COURS);
        return mapper.toLivraisonResponse(livraisonRepo.save(livraison));
    }

    @Transactional
    @Auditable(action = AuditAction.UPDATE, entityType = "Livraison")
    public LivraisonDto.Response confirm(UUID id) {
        Livraison livraison = loadWithLines(id);

        if (!livraison.getStatus().canTransitionTo(LivraisonStatus.LIVREE)) {
            throw new IllegalStateException(
                    "Cannot confirm delivery from status: " + livraison.getStatus());
        }

        livraison.setStatus(LivraisonStatus.LIVREE);
        Livraison saved = livraisonRepo.save(livraison);

        // Cross-module event: inventory-service will create StockMovement(SORTIE)
        publishConfirmedEvent(saved);

        return mapper.toLivraisonResponse(saved);
    }

    private void publishConfirmedEvent(Livraison livraison) {
        List<LivraisonConfirmedEvent.Line> eventLines = livraison.getLines().stream()
                .filter(l -> l.getQuantityDelivered() != null
                        && l.getQuantityDelivered().compareTo(java.math.BigDecimal.ZERO) > 0)
                .map(l -> new LivraisonConfirmedEvent.Line(
                        l.getProductId(),
                        l.getProductReference(),
                        l.getQuantityDelivered()))
                .toList();

        LivraisonConfirmedEvent event = new LivraisonConfirmedEvent(
                UUID.randomUUID(),
                tid(),
                livraison.getId(),
                livraison.getCommandeId(),
                Instant.now(),
                eventLines);

        eventPublisher.publishLivraisonConfirmed(event);
    }

    private Livraison loadWithLines(UUID id) {
        return livraisonRepo.findByTenantAndIdWithLines(tid(), id)
                .orElseThrow(() -> new EntityNotFoundException("Livraison not found: " + id));
    }

    private static UUID tid() {
        return com.erp.common.tenant.TenantUtils.safeTenantUuid();
    }
}
