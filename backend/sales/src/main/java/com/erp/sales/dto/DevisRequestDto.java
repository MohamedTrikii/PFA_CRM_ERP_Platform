package com.erp.sales.dto;

import com.erp.sales.domain.DevisRequestStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface DevisRequestDto {

    record ItemRequest(
            @NotNull @Min(1) short quantity,
            @NotNull @Positive BigDecimal widthMm,
            @NotNull @Positive BigDecimal heightMm,
            @Size(max = 64) String profileSeries,
            @Size(max = 64) String openingType,
            @Size(max = 64) String glassType,
            @Size(max = 64) String color,
            String accessories,
            String notes
    ) {}

    record ItemResponse(
            UUID id,
            short quantity,
            BigDecimal widthMm,
            BigDecimal heightMm,
            String profileSeries,
            String openingType,
            String glassType,
            String color,
            String accessories,
            String notes
    ) {}

    record Create(
            @NotBlank @Size(max = 255) String clientName,
            @Email @Size(max = 255) String clientEmail,
            @Size(max = 32) String clientPhone,
            String clientAddress,
            @NotBlank @Size(max = 64) String projectType,
            String description,
            @NotEmpty @Valid List<ItemRequest> items
    ) {}

    record Summary(
            UUID id,
            String clientName,
            String clientEmail,
            String projectType,
            DevisRequestStatus status,
            UUID convertedDevisId,
            int itemCount,
            Instant createdAt
    ) {}

    record Response(
            UUID id,
            UUID clientId,
            String clientName,
            String clientEmail,
            String clientPhone,
            String clientAddress,
            String projectType,
            String description,
            DevisRequestStatus status,
            UUID convertedDevisId,
            String notes,
            List<ItemResponse> items,
            List<AttachmentDto.Response> attachments,
            Instant createdAt,
            Instant updatedAt
    ) {}

    record AddNote(
            @NotBlank String notes,
            DevisRequestStatus status
    ) {}
}
