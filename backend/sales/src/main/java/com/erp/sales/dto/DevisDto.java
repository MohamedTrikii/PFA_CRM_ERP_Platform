package com.erp.sales.dto;

import com.erp.sales.domain.DevisStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface DevisDto {

    record LineResponse(
            UUID id,
            UUID productId,
            String productReference,
            String productName,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal tvaRate,
            BigDecimal discountPct,
            BigDecimal totalHt,
            BigDecimal totalTva,
            BigDecimal totalTtc
    ) {}

    record Response(
            UUID id,
            UUID clientId,
            String reference,
            DevisStatus status,
            LocalDate validUntil,
            String notes,
            BigDecimal totalHt,
            BigDecimal totalTva,
            BigDecimal totalTtc,
            List<LineResponse> lines,
            Instant createdAt
    ) {}

    record Summary(
            UUID id,
            UUID clientId,
            String reference,
            DevisStatus status,
            LocalDate validUntil,
            BigDecimal totalTtc,
            Instant createdAt
    ) {}

    record LineRequest(
            @NotNull UUID productId,
            @NotNull @Positive BigDecimal quantity,
            BigDecimal discountPct
    ) {}

    record Create(
            @NotNull UUID clientId,
            LocalDate validUntil,
            String notes,
            @NotEmpty @Valid List<LineRequest> lines
    ) {}

    record AddLine(
            @NotNull UUID productId,
            @NotNull @Positive BigDecimal quantity,
            BigDecimal discountPct
    ) {}

    record Transition(
            @NotNull DevisStatus targetStatus
    ) {}
}
