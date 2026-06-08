package com.erp.sales.service;

import com.erp.common.tenant.TenantContext;
import com.erp.sales.domain.Facture;
import com.erp.sales.dto.AgingDto;
import com.erp.sales.repository.FactureRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FactureAgingService {

    private final FactureRepository factureRepo;

    private static UUID tid() { return UUID.fromString(TenantContext.requireTenant()); }

    public AgingDto.AgingReport summary() {
        List<Facture> unpaid = factureRepo.findUnpaidByTenant(tid());
        LocalDate today = LocalDate.now();

        List<AgingDto.AgingInvoice>[] buckets = classify(unpaid, today);

        return new AgingDto.AgingReport(
                toBucket("Courant", buckets[0]),
                toBucket("1-30 jours", buckets[1]),
                toBucket("31-60 jours", buckets[2]),
                toBucket("61-90 jours", buckets[3]),
                toBucket(">90 jours", buckets[4]),
                totalOutstanding(unpaid)
        );
    }

    public AgingDto.AgingDetail detail() {
        List<Facture> unpaid = factureRepo.findUnpaidByTenant(tid());
        LocalDate today = LocalDate.now();
        List<AgingDto.AgingInvoice>[] buckets = classify(unpaid, today);
        return new AgingDto.AgingDetail(buckets[0], buckets[1], buckets[2], buckets[3], buckets[4]);
    }

    @SuppressWarnings("unchecked")
    private List<AgingDto.AgingInvoice>[] classify(List<Facture> invoices, LocalDate today) {
        List<AgingDto.AgingInvoice>[] buckets = new List[5];
        for (int i = 0; i < 5; i++) buckets[i] = new ArrayList<>();

        for (Facture f : invoices) {
            AgingDto.AgingInvoice inv = toAgingInvoice(f);
            if (f.getDueDate() == null || !today.isAfter(f.getDueDate())) {
                buckets[0].add(inv);
            } else {
                long daysOverdue = today.toEpochDay() - f.getDueDate().toEpochDay();
                if      (daysOverdue <= 30)  buckets[1].add(inv);
                else if (daysOverdue <= 60)  buckets[2].add(inv);
                else if (daysOverdue <= 90)  buckets[3].add(inv);
                else                         buckets[4].add(inv);
            }
        }
        return buckets;
    }

    private AgingDto.AgingBucket toBucket(String label, List<AgingDto.AgingInvoice> items) {
        BigDecimal amount = items.stream()
                .map(AgingDto.AgingInvoice::outstanding)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new AgingDto.AgingBucket(label, items.size(), amount);
    }

    private BigDecimal totalOutstanding(List<Facture> invoices) {
        return invoices.stream()
                .map(f -> f.getTotalTtc().subtract(f.getAmountPaid()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private AgingDto.AgingInvoice toAgingInvoice(Facture f) {
        BigDecimal outstanding = f.getTotalTtc().subtract(f.getAmountPaid());
        return new AgingDto.AgingInvoice(
                f.getId(),
                f.getReference(),
                f.getDueDate(),
                f.getTotalTtc(),
                f.getAmountPaid(),
                outstanding,
                f.getStatus().name()
        );
    }
}
