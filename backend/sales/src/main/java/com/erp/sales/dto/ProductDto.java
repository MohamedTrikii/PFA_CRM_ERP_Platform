package com.erp.sales.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public interface ProductDto {

    record Response(
            UUID id,
            String reference,
            String name,
            String description,
            String unit,
            BigDecimal unitPrice,
            BigDecimal tvaRate,
            boolean active,
            Instant createdAt
    ) {}

    record Create(
            @NotBlank @Size(max = 64) String reference,
            @NotBlank @Size(max = 255) String name,
            String description,
            @Size(max = 16) String unit,
            @NotNull @Positive BigDecimal unitPrice,
            @NotNull BigDecimal tvaRate,
            UUID tenantId   // SUPER_ADMIN only: target tenant override
    ) {}

    record Update(
            @Size(max = 255) String name,
            String description,
            @Size(max = 16) String unit,
            @Positive BigDecimal unitPrice,
            BigDecimal tvaRate,
            Boolean active
    ) {}
}
