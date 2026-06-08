package com.erp.identity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public interface TenantDto {

    record Request(
        @NotBlank @Size(min = 2, max = 63)
        @Pattern(regexp = "^[a-z0-9-]+$")
        String slug,

        @NotBlank @Size(max = 255)
        String name
    ) {}

    record Response(
        UUID    id,
        String  slug,
        String  name,
        boolean active,
        Instant createdAt
    ) {}
}
