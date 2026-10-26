package com.erp.sales.service;

import com.erp.sales.domain.*;
import com.erp.sales.dto.DashboardDto;
import com.erp.sales.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class DashboardService {

    private final DevisRepository          devisRepo;
    private final CommandeRepository       commandeRepo;
    private final LivraisonRepository      livraisonRepo;
    private final FactureRepository        factureRepo;
    private final DevisRequestRepository   requestRepo;

    private static UUID tid() {
        return com.erp.common.tenant.TenantUtils.safeTenantUuid();
    }

    public DashboardDto.EmployerSummary employerSummary() {
        UUID tid = tid();

        long openDevis       = devisRepo.countOpenByTenant(tid);
        long pendingRequests = requestRepo.countPendingByTenant(tid);
        long pendingLivs     = livraisonRepo.countPendingByTenant(tid);

        LocalDate firstOfMonth = LocalDate.now().withDayOfMonth(1);
        LocalDate firstOfYear  = LocalDate.now().withDayOfYear(1);
        BigDecimal revMtd = factureRepo.sumRevenueByTenantSince(tid, firstOfMonth);
        BigDecimal revYtd = factureRepo.sumRevenueByTenantSince(tid, firstOfYear);
        long overdue = factureRepo.countOverdueByTenant(tid);

        List<DashboardDto.FunnelStep> funnel = new ArrayList<>();
        funnel.add(new DashboardDto.FunnelStep("Demandes",  requestRepo.countAllByTenant(tid)));
        funnel.add(new DashboardDto.FunnelStep("Devis",     devisRepo.countAllByTenant(tid)));
        funnel.add(new DashboardDto.FunnelStep("Commandes", commandeRepo.countAllByTenant(tid)));
        funnel.add(new DashboardDto.FunnelStep("Factures",  factureRepo.countAllByTenant(tid)));

        return new DashboardDto.EmployerSummary(
            openDevis, pendingRequests, pendingLivs,
            revMtd != null ? revMtd : BigDecimal.ZERO,
            revYtd != null ? revYtd : BigDecimal.ZERO,
            overdue, funnel
        );
    }

    public DashboardDto.EmployeeSummary employeeSummary() {
        UUID tid = tid();
        return new DashboardDto.EmployeeSummary(
            livraisonRepo.countByTenantAndStatus(tid, LivraisonStatus.PLANIFIEE),
            livraisonRepo.countByTenantAndStatus(tid, LivraisonStatus.EN_COURS),
            requestRepo.countByTenantAndStatus(tid, DevisRequestStatus.NOUVEAU),
            commandeRepo.countOpenByTenant(tid)
        );
    }

    public DashboardDto.ClientSummary clientSummary(UUID clientId, String clientEmail) {
        UUID tid = tid();
        List<Facture> factures = factureRepo.findByTenantAndClient(tid, clientId);
        BigDecimal invoiced = factures.stream()
            .map(Facture::getTotalTtc)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal paid = factures.stream()
            .map(Facture::getAmountPaid)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new DashboardDto.ClientSummary(
            devisRepo.countByTenantAndClient(tid, clientId),
            devisRepo.countByTenantAndClientAndStatus(tid, clientId, DevisStatus.ACCEPTE),
            requestRepo.countByTenantAndEmail(tid, clientEmail),
            invoiced,
            paid
        );
    }
}
