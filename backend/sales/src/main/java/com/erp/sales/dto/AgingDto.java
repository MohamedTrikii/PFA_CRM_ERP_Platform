package com.erp.sales.dto;

import java.math.BigDecimal;
import java.util.List;

public final class AgingDto {

    private AgingDto() {}

    public record AgingReport(
            AgingBucket current,
            AgingBucket days1_30,
            AgingBucket days31_60,
            AgingBucket days61_90,
            AgingBucket over90,
            BigDecimal totalOutstanding
    ) {}

    public record AgingBucket(
            String label,
            long count,
            BigDecimal amount
    ) {}

    public record AgingDetail(
            List<AgingInvoice> current,
            List<AgingInvoice> days1_30,
            List<AgingInvoice> days31_60,
            List<AgingInvoice> days61_90,
            List<AgingInvoice> over90
    ) {}

    public record AgingInvoice(
            java.util.UUID id,
            String reference,
            java.time.LocalDate dueDate,
            BigDecimal totalTtc,
            BigDecimal amountPaid,
            BigDecimal outstanding,
            String status
    ) {}
}
