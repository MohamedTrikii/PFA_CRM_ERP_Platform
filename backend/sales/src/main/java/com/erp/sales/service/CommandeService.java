package com.erp.sales.service;

import com.erp.common.audit.Auditable;
import com.erp.common.audit.AuditAction;
import com.erp.common.tenant.TenantContext;
import com.erp.sales.domain.*;
import com.erp.sales.dto.CommandeDto;
import com.erp.sales.mapper.SalesMapper;
import com.erp.sales.repository.CommandeRepository;
import com.erp.sales.repository.DevisRepository;
import com.erp.sales.repository.LivraisonRepository;
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
public class CommandeService {

    private final CommandeRepository commandeRepo;
    private final DevisRepository devisRepo;
    private final LivraisonRepository livraisonRepo;
    private final SalesMapper mapper;

    public Page<CommandeDto.Response> findAll(Pageable pageable) {
        return commandeRepo.findAllByTenant(tid(), pageable).map(mapper::toCommandeResponse);
    }

    public CommandeDto.Response findById(UUID id) {
        return mapper.toCommandeResponse(load(id));
    }

    /**
     * Called when a Devis transitions to ACCEPTE — auto-creates the Commande.
     */
    @Transactional
    @Auditable(action = AuditAction.CREATE, entityType = "Commande")
    public CommandeDto.Response createFromDevis(UUID devisId) {
        Devis devis = devisRepo.findByTenantAndIdWithLines(tid(), devisId)
                .orElseThrow(() -> new EntityNotFoundException("Devis not found: " + devisId));

        if (devis.getStatus() != DevisStatus.ACCEPTE) {
            throw new IllegalStateException("Devis must be ACCEPTE to create a Commande");
        }
        if (commandeRepo.findByTenantAndDevis(tid(), devisId).isPresent()) {
            throw new IllegalStateException("Commande already exists for devis: " + devisId);
        }

        Commande commande = new Commande();
        commande.setDevisId(devisId);
        commande.setReference("CMD-" + System.currentTimeMillis());
        commande.setStatus(CommandeStatus.EN_ATTENTE);

        Commande saved = commandeRepo.save(commande);

        // Auto-create the initial Livraison for this Commande
        createLivraisonForCommande(saved, devis);

        return mapper.toCommandeResponse(saved);
    }

    @Transactional
    @Auditable(action = AuditAction.UPDATE, entityType = "Commande")
    public CommandeDto.Response transition(UUID id, CommandeDto.Transition dto) {
        Commande commande = load(id);
        if (!commande.getStatus().canTransitionTo(dto.targetStatus())) {
            throw new IllegalStateException(
                    "Cannot transition from " + commande.getStatus() + " to " + dto.targetStatus());
        }
        commande.setStatus(dto.targetStatus());
        return mapper.toCommandeResponse(commandeRepo.save(commande));
    }

    @Transactional
    public CommandeDto.Response updateDelivery(UUID id, CommandeDto.UpdateDelivery dto) {
        Commande commande = load(id);
        if (dto.expectedDeliveryDate() != null) commande.setExpectedDeliveryDate(dto.expectedDeliveryDate());
        if (dto.notes() != null) commande.setNotes(dto.notes());
        return mapper.toCommandeResponse(commandeRepo.save(commande));
    }

    private void createLivraisonForCommande(Commande commande, Devis devis) {
        Livraison livraison = new Livraison();
        livraison.setCommandeId(commande.getId());
        livraison.setReference("LIV-" + System.currentTimeMillis());
        livraison.setStatus(LivraisonStatus.PLANIFIEE);

        for (DevisLine dl : devis.getLines()) {
            LivraisonLine ll = new LivraisonLine();
            ll.setLivraison(livraison);
            ll.setProductId(dl.getProductId());
            ll.setProductReference(
                    dl.getProductSnapshot() != null
                            ? (String) dl.getProductSnapshot().get("reference")
                            : null);
            ll.setQuantityOrdered(dl.getQuantity());
            ll.setQuantityDelivered(java.math.BigDecimal.ZERO);
            livraison.getLines().add(ll);
        }
        livraisonRepo.save(livraison);
    }

    private Commande load(UUID id) {
        return commandeRepo.findByTenantAndId(tid(), id)
                .orElseThrow(() -> new EntityNotFoundException("Commande not found: " + id));
    }

    private static UUID tid() {
        return UUID.fromString(TenantContext.requireTenant());
    }
}
