package com.erp.crm.dto;

import com.erp.crm.domain.ClientType;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public interface ClientDto {
    record CreateRequest(
        @NotBlank String name,
        String email, String phone,
        Map<String, Object> address,
        ClientType type,
        String reference,
        UUID prospectId,
        String notes
    ) {}

    record UpdateRequest(
        String name, String email, String phone,
        Map<String, Object> address, ClientType type,
        String notes, Boolean active
    ) {}

    record Response(
        UUID id, UUID tenantId, String reference, String name,
        String email, String phone, Map<String, Object> address,
        ClientType type, boolean active, UUID prospectId,
        Instant createdAt
    ) {}
}
