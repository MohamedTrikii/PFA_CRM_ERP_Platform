package com.erp.sales.service;

import com.erp.common.audit.Auditable;
import com.erp.common.audit.AuditAction;
import com.erp.common.tenant.TenantContext;
import com.erp.sales.domain.*;
import com.erp.sales.dto.FactureDto;
import com.erp.sales.mapper.SalesMapper;
import com.erp.sales.repository.CommandeRepository;
import com.erp.sales.repository.DevisRepository;
import com.erp.sales.repository.FactureRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FactureService {

    private final FactureRepository factureRepo;
    private final CommandeRepository commandeRepo;
    private final DevisRepository devisRepo;
    private final SalesMapper mapper;

    public Page<FactureDto.Summary> findAll(Pageable pageable) {
        return factureRepo.findAllByTenant(tid(), pageable).map(mapper::toFactureSummary);
    }

    public FactureDto.Response findById(UUID id) {
        return mapper.toFactureResponse(loadWithLines(id));
    }

    /**
     * Auto-creates a Facture from a confirmed Commande.
     * Lines are copied from the Devis lines (prices locked at quote time).
     */
    @Transactional
    @Auditable(action = AuditAction.CREATE, entityType = "Facture")
    public FactureDto.Response createFromCommande(UUID commandeId) {
        UUID tid = tid();
        Commande commande = commandeRepo.findByTenantAndId(tid, commandeId)
                .orElseThrow(() -> new EntityNotFoundException("Commande not found: " + commandeId));

        if (factureRepo.findByTenantAndCommande(tid, commandeId).isPresent()) {
            throw new IllegalStateException("Facture already exists for commande: " + commandeId);
        }

        Devis devis = devisRepo.findByTenantAndIdWithLines(tid, commande.getDevisId())
                .orElseThrow(() -> new EntityNotFoundException("Devis not found for commande: " + commandeId));

        Facture facture = new Facture();
        facture.setCommandeId(commandeId);
        facture.setClientId(devis.getClientId());
        facture.setReference("FAC-" + System.currentTimeMillis());
        facture.setStatus(FactureStatus.BROUILLON);
        facture.setIssueDate(LocalDate.now());
        facture.setDueDate(LocalDate.now().plusDays(30));

        for (DevisLine dl : devis.getLines()) {
            FactureLine fl = new FactureLine();
            fl.setFacture(facture);
            fl.setProductId(dl.getProductId());
            fl.setDescription(dl.getDescription());
            fl.setQuantity(dl.getQuantity());
            fl.setUnitPrice(dl.getUnitPrice());
            fl.setTvaRate(dl.getTvaRate());
            fl.setDiscountPct(dl.getDiscountPct());
            facture.getLines().add(fl);
        }

        recalculateTotals(facture);
        return mapper.toFactureResponse(factureRepo.save(facture));
    }

    @Transactional
    @Auditable(action = AuditAction.UPDATE, entityType = "Facture")
    public FactureDto.Response encaisser(UUID factureId, FactureDto.Encaisser dto) {
        Facture facture = loadWithLines(factureId);

        if (facture.getStatus() == FactureStatus.PAYEE) {
            throw new IllegalStateException("Facture is already fully paid");
        }
        if (dto.amount().compareTo(facture.remainingAmount()) > 0) {
            throw new IllegalArgumentException(
                    "Payment amount exceeds remaining balance: " + facture.remainingAmount());
        }

        Encaissement enc = new Encaissement();
        enc.setFacture(facture);
        enc.setAmount(dto.amount());
        enc.setPaymentMethod(dto.paymentMethod());
        enc.setReference(dto.reference());
        enc.setNotes(dto.notes());
        facture.getEncaissements().add(enc);

        BigDecimal newAmountPaid = facture.getAmountPaid().add(dto.amount());
        facture.setAmountPaid(newAmountPaid);

        if (newAmountPaid.compareTo(facture.getTotalTtc()) >= 0) {
            facture.setStatus(FactureStatus.PAYEE);
        } else if (newAmountPaid.compareTo(BigDecimal.ZERO) > 0) {
            facture.setStatus(FactureStatus.PARTIELLEMENT_PAYEE);
        }

        return mapper.toFactureResponse(factureRepo.save(facture));
    }

    private void recalculateTotals(Facture facture) {
        BigDecimal totalHt = BigDecimal.ZERO;
        BigDecimal totalTva = BigDecimal.ZERO;
        for (FactureLine l : facture.getLines()) {
            // @PrePersist on FactureLine computes its totals; use them after trigger
            totalHt = totalHt.add(l.getTotalHt());
            totalTva = totalTva.add(l.getTotalTva());
        }
        facture.setTotalHt(totalHt);
        facture.setTotalTva(totalTva);
        facture.setTotalTtc(totalHt.add(totalTva));
    }

    private Facture loadWithLines(UUID id) {
        return factureRepo.findByTenantAndIdWithLines(tid(), id)
                .orElseThrow(() -> new EntityNotFoundException("Facture not found: " + id));
    }

    private static UUID tid() {
        return UUID.fromString(TenantContext.requireTenant());
    }
}
