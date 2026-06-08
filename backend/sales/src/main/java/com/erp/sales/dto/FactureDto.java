package com.erp.sales.dto;

import com.erp.sales.domain.FactureStatus;
import com.erp.sales.domain.PaymentMethod;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface FactureDto {

    record LineResponse(
            UUID id,
            UUID productId,
            String description,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal tvaRate,
            BigDecimal discountPct,
            BigDecimal totalHt,
            BigDecimal totalTva,
            BigDecimal totalTtc
    ) {}

    record EncaissementResponse(
            UUID id,
            BigDecimal amount,
            LocalDate paymentDate,
            PaymentMethod paymentMethod,
            String reference
    ) {}

    record Response(
            UUID id,
            UUID commandeId,
            UUID clientId,
            String reference,
            FactureStatus status,
            LocalDate issueDate,
            LocalDate dueDate,
            String notes,
            BigDecimal totalHt,
            BigDecimal totalTva,
            BigDecimal totalTtc,
            BigDecimal amountPaid,
            BigDecimal remainingAmount,
            List<LineResponse> lines,
            List<EncaissementResponse> encaissements,
            Instant createdAt
    ) {}

    record Summary(
            UUID id,
            UUID clientId,
            String reference,
            FactureStatus status,
            LocalDate dueDate,
            BigDecimal totalTtc,
            BigDecimal amountPaid,
            Instant createdAt
    ) {}

    record Encaisser(
            @NotNull @Positive BigDecimal amount,
            @NotNull PaymentMethod paymentMethod,
            @Size(max = 64) String reference,
            String notes
    ) {}
}
