package com.erp.sales.dto;

import java.math.BigDecimal;
import java.util.List;

public final class DashboardDto {

    private DashboardDto() {}

    public record EmployerSummary(
        long openDevisCount,
        long pendingRequestsCount,
        long pendingLivraisonsCount,
        BigDecimal revenueMtd,
        BigDecimal revenueYtd,
        long overdueFacturesCount,
        List<FunnelStep> salesFunnel
    ) {}

    public record FunnelStep(String stage, long count) {}

    public record EmployeeSummary(
        long livraisonsEnPreparation,
        long livraisonsPretes,
        long requestsNouveaux,
        long openCommandes
    ) {}

    public record ClientSummary(
        long totalDevis,
        long acceptedDevis,
        long pendingRequests,
        BigDecimal totalInvoiced,
        BigDecimal totalPaid
    ) {}
}
