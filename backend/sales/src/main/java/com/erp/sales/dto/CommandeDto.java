package com.erp.sales.dto;

import com.erp.sales.domain.CommandeStatus;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public interface CommandeDto {

    record Response(
            UUID id,
            UUID devisId,
            String reference,
            CommandeStatus status,
            LocalDate expectedDeliveryDate,
            String notes,
            Instant createdAt
    ) {}

    record Transition(
            @NotNull CommandeStatus targetStatus
    ) {}

    record UpdateDelivery(
            LocalDate expectedDeliveryDate,
            String notes
    ) {}
}
