package com.erp.achat.service;

import com.erp.achat.domain.*;
import com.erp.achat.dto.AchatDto;
import com.erp.achat.mapper.AchatMapper;
import com.erp.achat.repository.BonCommandeRepository;
import com.erp.achat.repository.FournisseurRepository;
import com.erp.common.exception.BadRequestException;
import com.erp.common.exception.ConflictException;
import com.erp.common.exception.ResourceNotFoundException;
import com.erp.common.tenant.TenantUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.erp.achat.strategy.TvaCalculationStrategy;
import com.erp.achat.observer.BonCommandeStatusPublisher;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.ArrayList;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BonCommandeService {

    private static final Logger log = LoggerFactory.getLogger(BonCommandeService.class);

    private final BonCommandeRepository bonCommandeRepo;
    private final FournisseurRepository fournisseurRepo;
    private final AchatMapper mapper;
    private final TvaCalculationStrategy tvaCalculationStrategy;
    private final BonCommandeStatusPublisher statusPublisher;

    private static UUID tid() { return TenantUtils.safeTenantUuid(); }

    public Page<AchatDto.BonCommandeSummary> list(Pageable pageable) {
        return bonCommandeRepo.findAllByTenant(tid(), pageable).map(mapper::toBonCommandeSummary);
    }

    public Page<AchatDto.BonCommandeSummary> listByStatus(BonCommandeStatus status, Pageable pageable) {
        return bonCommandeRepo.findByTenantAndStatus(tid(), status, pageable).map(mapper::toBonCommandeSummary);
    }

    public AchatDto.BonCommandeResponse getById(UUID id) {
        BonCommande bc = bonCommandeRepo.findByTenantAndIdWithLignes(tid(), id)
                .orElseThrow(() -> new ResourceNotFoundException("BonCommande not found: " + id));
        loadFournisseur(bc);
        return mapper.toBonCommandeResponse(bc);
    }

    @Transactional
    public AchatDto.BonCommandeResponse create(UUID createdBy, AchatDto.BonCommandeCreateRequest req) {
        UUID tenantId = tid();
        if (bonCommandeRepo.existsByTenantAndReference(tenantId, req.reference())) {
            throw new ConflictException("Reference already exists: " + req.reference());
        }
        Fournisseur fournisseur = fournisseurRepo.findByTenantAndId(tenantId, req.fournisseurId())
                .orElseThrow(() -> new ResourceNotFoundException("Fournisseur not found: " + req.fournisseurId()));

        BonCommande bc = BonCommande.builder()
                .fournisseurId(fournisseur.getId())
                .reference(req.reference())
                .dateCommande(LocalDate.now())
                .dateLivraisonPrevue(req.dateLivraison())
                .notes(req.notes())
                .createdBy(createdBy)
                .lignes(new ArrayList<>())
                .build();
        bc.setTenantId(tenantId);

        for (AchatDto.BonCommandeLigneRequest lr : req.lignes()) {
            BonCommandeLigne ligne = buildLigne(bc, lr);
            bc.getLignes().add(ligne);
        }

        computeTotals(bc);
        BonCommande saved = bonCommandeRepo.save(bc);
        saved.setFournisseur(fournisseur);
        return mapper.toBonCommandeResponse(saved);
    }

    @Transactional
    public AchatDto.BonCommandeResponse transition(UUID id, BonCommandeStatus targetStatus) {
        BonCommande bc = bonCommandeRepo.findByTenantAndIdWithLignes(tid(), id)
                .orElseThrow(() -> new ResourceNotFoundException("BonCommande not found: " + id));

        if (!bc.getStatus().canTransitionTo(targetStatus)) {
            throw new BadRequestException(
                    "Cannot transition from " + bc.getStatus() + " to " + targetStatus);
        }
        bc.setStatus(targetStatus);
        BonCommande saved = bonCommandeRepo.save(bc);
        // publish status change (best-effort)
        try { statusPublisher.publish(saved); } catch (Exception e) { log.warn("Failed to publish BonCommande status for {}", saved.getId(), e); }
        loadFournisseur(saved);
        return mapper.toBonCommandeResponse(saved);
    }

    private BonCommandeLigne buildLigne(BonCommande bc, AchatDto.BonCommandeLigneRequest lr) {
        BigDecimal qty  = lr.quantite();
        BigDecimal puHt = lr.prixUnitaire();
        BigDecimal remise = lr.remisePct() != null ? lr.remisePct() : BigDecimal.ZERO;
        BigDecimal tva    = lr.taxPct()    != null ? lr.taxPct()    : BigDecimal.valueOf(20);

        BigDecimal netHt = puHt.multiply(BigDecimal.ONE.subtract(remise.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP)));
        BigDecimal totalHt = netHt.multiply(qty).setScale(2, RoundingMode.HALF_UP);

        return BonCommandeLigne.builder()
                .bonCommande(bc)
                .productId(lr.productId())
                .designation(lr.designation())
                .reference(lr.reference())
                .quantite(qty)
                .prixUnitaireHt(puHt)
                .tvaRate(tva)
                .totalHt(totalHt)
                .build();

    }

    private void computeTotals(BonCommande bc) {
        BigDecimal totalHt  = BigDecimal.ZERO;
        BigDecimal totalTva = BigDecimal.ZERO;
        for (BonCommandeLigne l : bc.getLignes()) {
            totalHt = totalHt.add(l.getTotalHt());
            BigDecimal tva = tvaCalculationStrategy.calculateTva(l.getTotalHt(), l.getTvaRate());
            totalTva = totalTva.add(tva);
        }
        bc.setTotalHt(totalHt.setScale(2, RoundingMode.HALF_UP));
        bc.setTotalTva(totalTva.setScale(2, RoundingMode.HALF_UP));
        bc.setTotalTtc(totalHt.add(totalTva).setScale(2, RoundingMode.HALF_UP));
    }

    private void loadFournisseur(BonCommande bc) {
        fournisseurRepo.findByTenantAndId(tid(), bc.getFournisseurId())
                .ifPresent(bc::setFournisseur);
    }
}
