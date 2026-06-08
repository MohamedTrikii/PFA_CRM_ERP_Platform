package com.erp.sales.dto;

import com.erp.sales.domain.LivraisonStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface LivraisonDto {

    record LineResponse(
            UUID id,
            UUID productId,
            String productReference,
            BigDecimal quantityOrdered,
            BigDecimal quantityDelivered
    ) {}

    record Response(
            UUID id,
            UUID commandeId,
            String reference,
            LivraisonStatus status,
            LocalDate deliveryDate,
            String notes,
            List<LineResponse> lines,
            Instant createdAt
    ) {}

    record Summary(
            UUID id,
            UUID commandeId,
            String reference,
            LivraisonStatus status,
            LocalDate deliveryDate,
            Instant createdAt
    ) {}

    record DeliverLine(
            @NotNull UUID lineId,
            @NotNull @Positive BigDecimal quantityDelivered
    ) {}

    record Deliver(
            LocalDate deliveryDate,
            List<DeliverLine> lines
    ) {}

    record Transition(
            @NotNull LivraisonStatus targetStatus
    ) {}
}
