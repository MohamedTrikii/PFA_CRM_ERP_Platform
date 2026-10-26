package com.erp.achat.service;

import com.erp.achat.domain.*;
import com.erp.achat.dto.AchatDto;
import com.erp.achat.mapper.AchatMapper;
import com.erp.achat.messaging.AchatEventPublisher;
import com.erp.achat.repository.BonCommandeRepository;
import com.erp.achat.repository.BonReceptionRepository;
import com.erp.common.event.ReceptionConfirmedEvent;
import com.erp.common.exception.BadRequestException;
import com.erp.common.exception.ResourceNotFoundException;
import com.erp.common.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BonReceptionService {

    private final BonReceptionRepository bonReceptionRepo;
    private final BonCommandeRepository  bonCommandeRepo;
    private final AchatMapper            mapper;
    private final AchatEventPublisher    publisher;

    private static final UUID SYSTEM_TENANT = UUID.fromString("00000000-0000-0000-0000-000000000001");

    private static UUID tid() {
        String tenantId = TenantContext.get();
        return (tenantId == null || tenantId.isBlank())
                ? SYSTEM_TENANT
                : UUID.fromString(tenantId);
    }

    public Page<AchatDto.BonReceptionSummary> list(Pageable pageable) {
        return bonReceptionRepo.findAllByTenant(tid(), pageable).map(mapper::toBonReceptionSummary);
    }

    public AchatDto.BonReceptionResponse getById(UUID id) {
        return mapper.toBonReceptionResponse(find(id));
    }

    public List<AchatDto.BonReceptionSummary> listByBonCommande(UUID bonCommandeId) {
        return mapper.toBonReceptionSummaryList(
                bonReceptionRepo.findByTenantAndBonCommande(tid(), bonCommandeId));
    }

    @Transactional
    public AchatDto.BonReceptionResponse create(UUID createdBy, AchatDto.BonReceptionCreateRequest req) {
        UUID tenantId = tid();

        BonCommande bc = bonCommandeRepo.findByTenantAndId(tenantId, req.bonCommandeId())
                .orElseThrow(() -> new ResourceNotFoundException("BonCommande not found: " + req.bonCommandeId()));

        if (bc.getStatus() == BonCommandeStatus.ANNULE || bc.getStatus() == BonCommandeStatus.BROUILLON) {
            throw new BadRequestException("Cannot receive against BonCommande in status: " + bc.getStatus());
        }

        BonReception br = BonReception.builder()
                .bonCommandeId(bc.getId())
                .reference(req.reference())
                .dateReception(req.dateReception())
                .notes(req.notes())
                .createdBy(createdBy)
                .lignes(new ArrayList<>())
                .build();
        br.setTenantId(tenantId);

        for (AchatDto.BonReceptionLigneRequest lr : req.lignes()) {
            BonReceptionLigne ligne = BonReceptionLigne.builder()
                    .bonReception(br)
                    .bonCommandeLigneId(lr.bonCommandeLigneId())
                    .productId(lr.productId())
                    .designation(lr.designation())
                    .quantiteCommandee(lr.quantiteCommandee())
                    .quantiteRecue(lr.quantiteRecue())
                    .locationId(lr.locationId())
                    .position(lr.position())
                    .build();
            br.getLignes().add(ligne);
        }

        return mapper.toBonReceptionResponse(bonReceptionRepo.save(br));
    }

    @Transactional
    public AchatDto.BonReceptionResponse confirm(UUID id) {
        BonReception br = find(id);
        if (br.getStatus() != BonReceptionStatus.EN_COURS) {
            throw new BadRequestException("BonReception is not EN_COURS: " + br.getStatus());
        }
        br.setStatus(BonReceptionStatus.CONFIRME);
        BonReception saved = bonReceptionRepo.save(br);

        updateBonCommandeStatus(saved);

        publisher.publishReceptionConfirmed(buildEvent(saved));

        return mapper.toBonReceptionResponse(saved);
    }

    @Transactional
    public AchatDto.BonReceptionResponse cancel(UUID id) {
        BonReception br = find(id);
        if (!br.getStatus().canTransitionTo(BonReceptionStatus.ANNULE)) {
            throw new BadRequestException("Cannot cancel BonReception in status: " + br.getStatus());
        }
        br.setStatus(BonReceptionStatus.ANNULE);
        return mapper.toBonReceptionResponse(bonReceptionRepo.save(br));
    }

    private void updateBonCommandeStatus(BonReception confirmedBr) {
        UUID tenantId = confirmedBr.getTenantId();
        UUID bcId     = confirmedBr.getBonCommandeId();

        bonCommandeRepo.findByTenantAndId(tenantId, bcId).ifPresent(bc -> {
            List<BonReception> allReceptions = bonReceptionRepo.findByTenantAndBonCommande(tenantId, bcId)
                    .stream().filter(r -> r.getStatus() == BonReceptionStatus.CONFIRME).toList();

            long confirmedCount = allReceptions.size();
            if (confirmedCount == 1 && bc.getStatus() == BonCommandeStatus.ENVOYE) {
                boolean allReceived = confirmedBr.getLignes().stream().allMatch(l ->
                        l.getQuantiteCommandee() == null ||
                        l.getQuantiteRecue().compareTo(l.getQuantiteCommandee()) >= 0);
                bc.setStatus(allReceived ? BonCommandeStatus.RECU : BonCommandeStatus.PARTIELLEMENT_RECU);
                bonCommandeRepo.save(bc);
            } else if (bc.getStatus() == BonCommandeStatus.PARTIELLEMENT_RECU) {
                bc.setStatus(BonCommandeStatus.RECU);
                bonCommandeRepo.save(bc);
            }
        });
    }

    private ReceptionConfirmedEvent buildEvent(BonReception br) {
        List<ReceptionConfirmedEvent.ReceptionLine> lines = br.getLignes().stream()
                .filter(l -> l.getProductId() != null)
                .map(l -> new ReceptionConfirmedEvent.ReceptionLine(
                        l.getProductId(),
                        l.getDesignation(),
                        l.getQuantiteRecue(),
                        l.getLocationId()))
                .toList();
        return new ReceptionConfirmedEvent(
                br.getTenantId().toString(),
                br.getId(),
                br.getBonCommandeId(),
                lines);
    }

    private BonReception find(UUID id) {
        return bonReceptionRepo.findByTenantAndIdWithLignes(tid(), id)
                .orElseThrow(() -> new ResourceNotFoundException("BonReception not found: " + id));
    }
}
