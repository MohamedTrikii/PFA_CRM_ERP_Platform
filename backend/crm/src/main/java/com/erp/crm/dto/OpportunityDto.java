package com.erp.crm.dto;

import com.erp.crm.domain.OpportunityStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public interface OpportunityDto {
    record CreateRequest(
        @NotNull UUID clientId,
        @NotBlank String title,
        String description,
        BigDecimal estimatedValue,
        @Min(0) @Max(100) Short probability,
        LocalDate expectedCloseDate,
        UUID assignedTo
    ) {}

    record UpdateRequest(
        String title, String description, OpportunityStatus status,
        BigDecimal estimatedValue, Short probability,
        LocalDate expectedCloseDate, UUID assignedTo
    ) {}

    record Response(
        UUID id, UUID tenantId, UUID clientId, String title,
        String description, OpportunityStatus status,
        BigDecimal estimatedValue, Short probability,
        LocalDate expectedCloseDate, UUID assignedTo,
        Instant createdAt
    ) {}
}
