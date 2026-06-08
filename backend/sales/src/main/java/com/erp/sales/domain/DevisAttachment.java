package com.erp.sales.domain;

import com.erp.common.domain.TenantEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;

import java.util.UUID;

@Entity
@Table(name = "devis_attachments")
@Filter(name = "tenantFilter")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DevisAttachment extends TenantEntity {

    /** DEVIS_REQUEST or DEVIS */
    @Column(name = "entity_type", nullable = false, length = 32)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private UUID entityId;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "content_type", nullable = false, length = 128)
    @Builder.Default
    private String contentType = "application/octet-stream";

    @Column(name = "file_size", nullable = false)
    @Builder.Default
    private long fileSize = 0L;

    /** Full path inside SeaweedFS filer, e.g. /erp/{tenantId}/attachments/{uuid}_{filename} */
    @Column(name = "seaweed_path", nullable = false, length = 512)
    private String seaweedPath;

    @Column(name = "uploaded_by")
    private UUID uploadedBy;
}
