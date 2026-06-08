package com.erp.inventory.dto;

import com.erp.inventory.domain.MovementType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public interface StockDto {

    record LocationResponse(UUID id, String code, String name, String description, boolean active) {}

    record LocationCreate(
            @NotNull String code,
            @NotNull String name,
            String description
    ) {}

    record ItemResponse(
            UUID id,
            UUID productId,
            String productReference,
            String productName,
            UUID locationId,
            BigDecimal quantity,
            BigDecimal reservedQuantity,
            BigDecimal availableQuantity,
            Instant updatedAt
    ) {}

    record MovementResponse(
            UUID id,
            UUID productId,
            String productReference,
            UUID locationId,
            MovementType movementType,
            BigDecimal quantity,
            String referenceType,
            UUID referenceId,
            String notes,
            Instant occurredAt
    ) {}

    record AdjustRequest(
            @NotNull UUID productId,
            UUID locationId,
            @NotNull MovementType movementType,
            @NotNull @Positive BigDecimal quantity,
            String notes
    ) {}
}
