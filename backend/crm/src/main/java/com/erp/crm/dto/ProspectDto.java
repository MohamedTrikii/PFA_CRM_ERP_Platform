package com.erp.crm.dto;

import com.erp.crm.domain.ProspectStatus;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.UUID;

public interface ProspectDto {
    record CreateRequest(
        @NotBlank String name,
        String email, String phone, String company,
        String source, String notes, UUID assignedTo,
        UUID tenantId   // SUPER_ADMIN only: target tenant override
    ) {}

    record UpdateRequest(
        String name, String email, String phone, String company,
        String source, ProspectStatus status, String notes, UUID assignedTo
    ) {}

    record Response(
        UUID id, UUID tenantId, String name, String email, String phone,
        String company, String source, ProspectStatus status,
        String notes, UUID assignedTo, Instant createdAt
    ) {}
}
