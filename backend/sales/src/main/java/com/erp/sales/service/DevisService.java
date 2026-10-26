package com.erp.sales.service;

import com.erp.common.audit.Auditable;
import com.erp.common.audit.AuditAction;
import com.erp.common.reference.DocumentReferenceGenerator;
// removed unused TenantContext import
import com.erp.sales.command.AccepterDevisCommand;
import com.erp.sales.command.DevisCommandInvoker;
import com.erp.sales.command.EnvoyerDevisCommand;
import com.erp.sales.memento.DevisCaretaker;
import com.erp.sales.domain.*;
import com.erp.sales.dto.DevisDto;
import com.erp.sales.factory.DocumentLineFactory;
import com.erp.sales.mapper.SalesMapper;
import com.erp.sales.observer.DevisStatusPublisher;
import com.erp.sales.repository.CatalogProductRepository;
import com.erp.sales.repository.DevisRepository;
import com.erp.sales.strategy.PricingContext;
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
public class DevisService {

    private final DevisRepository        devisRepo;
    private final CatalogProductRepository productRepo;
    private final SalesMapper            mapper;

    // ── GoF patterns ───────────────────────────────────────────────
    private final DocumentLineFactory    lineFactory;    // Factory
    private final PricingContext         pricingContext; // Strategy
    private final DevisCommandInvoker    commandInvoker; // Command
    private final DevisCaretaker         caretaker;      // Memento (Caretaker)
    private final DevisStatusPublisher   statusPublisher; // Observer

    public Page<DevisDto.Summary> findAll(Pageable pageable) {
        return devisRepo.findAllByTenant(tid(), pageable).map(mapper::toDevisSummary);
    }

    public DevisDto.Response findById(UUID id) {
        return mapper.toDevisResponse(loadWithLines(id));
    }

    @Transactional
    @Auditable(action = AuditAction.CREATE, entityType = "Devis")
    public DevisDto.Response create(DevisDto.Create dto) {
        Devis devis = new Devis();
        devis.setClientId(dto.clientId());
        // Singleton — générateur de référence unique par tenant/année
        devis.setReference(DocumentReferenceGenerator.getInstance().generate("DEV", tid().toString()));
        devis.setValidUntil(dto.validUntil());
        devis.setNotes(dto.notes());

        for (DevisDto.LineRequest lr : dto.lines()) {
            devis.addLine(buildLine(devis, lr));
        }
        devis.recalculate();
        return mapper.toDevisResponse(devisRepo.save(devis));
    }

    @Transactional
    @Auditable(action = AuditAction.UPDATE, entityType = "Devis")
    public DevisDto.Response addLine(UUID devisId, DevisDto.AddLine dto) {
        Devis devis = loadWithLines(devisId);
        requireDraft(devis);
        DevisDto.LineRequest lr = new DevisDto.LineRequest(dto.productId(), dto.quantity(), dto.discountPct());
        devis.addLine(buildLine(devis, lr));
        devis.recalculate();
        return mapper.toDevisResponse(devisRepo.save(devis));
    }

    @Transactional
    @Auditable(action = AuditAction.UPDATE, entityType = "Devis")
    public DevisDto.Response transition(UUID id, DevisDto.Transition dto) {
        Devis devis = loadWithLines(id);
        DevisStatus previous = devis.getStatus();

        // Command — encapsule la transition avec support undo/Memento
        switch (dto.targetStatus()) {
            case ENVOYE  -> commandInvoker.execute(new EnvoyerDevisCommand(devis, caretaker));
            case ACCEPTE -> commandInvoker.execute(new AccepterDevisCommand(devis, caretaker));
            default -> {
                if (!devis.getStatus().canTransitionTo(dto.targetStatus())) {
                    throw new IllegalStateException(
                            "Cannot transition from " + devis.getStatus() + " to " + dto.targetStatus());
                }
                devis.setStatus(dto.targetStatus());
            }
        }

        // Observer — notifie tous les observateurs du changement de statut
        statusPublisher.publish(devis, previous, devis.getStatus());

        return mapper.toDevisResponse(devisRepo.save(devis));
    }

    private DevisLine buildLine(Devis devis, DevisDto.LineRequest lr) {
        CatalogProduct product = productRepo.findByTenantAndId(tid(), lr.productId())
                .orElseThrow(() -> new EntityNotFoundException("Product not found: " + lr.productId()));

        // Strategy — prix calculé selon la stratégie active (Standard / Volume / Promo)
        product.setUnitPrice(pricingContext.applyPricing(product, lr.quantity()));

        // Factory — construction centralisée de la ligne avec snapshot produit
        return lineFactory.fromCatalogProduct(devis, product, lr.quantity(), lr.discountPct(),
                (short) devis.getLines().size());
    }

    private Devis loadWithLines(UUID id) {
        return devisRepo.findByTenantAndIdWithLines(tid(), id)
                .orElseThrow(() -> new EntityNotFoundException("Devis not found: " + id));
    }

    private static void requireDraft(Devis devis) {
        if (devis.getStatus() != DevisStatus.BROUILLON) {
            throw new IllegalStateException("Devis must be in BROUILLON status to modify");
        }
    }

    private static UUID tid() {
        return com.erp.common.tenant.TenantUtils.safeTenantUuid();
    }
}
