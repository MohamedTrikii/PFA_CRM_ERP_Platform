package com.erp.sales.dto;

import java.time.Instant;
import java.util.UUID;

public interface AttachmentDto {

    record Response(
            UUID id,
            String entityType,
            UUID entityId,
            String fileName,
            String contentType,
            long fileSize,
            Instant createdAt
    ) {}
}
