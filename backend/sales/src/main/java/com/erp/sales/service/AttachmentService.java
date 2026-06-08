package com.erp.sales.service;

import com.erp.common.tenant.TenantContext;
import com.erp.sales.domain.DevisAttachment;
import com.erp.sales.dto.AttachmentDto;
import com.erp.sales.repository.DevisAttachmentRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AttachmentService {

    private final DevisAttachmentRepository attachmentRepo;
    private final SeaweedFsService seaweedFs;

    public List<AttachmentDto.Response> findByEntity(String entityType, UUID entityId) {
        return attachmentRepo.findByEntity(tid(), entityType, entityId)
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public AttachmentDto.Response upload(String entityType, UUID entityId, MultipartFile file)
            throws IOException {
        UUID tenantId = tid();
        String path = seaweedFs.upload(tenantId, file);

        DevisAttachment attachment = new DevisAttachment();
        attachment.setEntityType(entityType);
        attachment.setEntityId(entityId);
        attachment.setFileName(file.getOriginalFilename() != null
                ? file.getOriginalFilename() : "file");
        attachment.setContentType(file.getContentType() != null
                ? file.getContentType() : "application/octet-stream");
        attachment.setFileSize(file.getSize());
        attachment.setSeaweedPath(path);
        attachment.setUploadedBy(currentUserId());

        return toDto(attachmentRepo.save(attachment));
    }

    public ResponseEntity<byte[]> download(UUID attachmentId) {
        DevisAttachment att = attachmentRepo.findByTenantAndId(tid(), attachmentId)
                .orElseThrow(() -> new EntityNotFoundException("Attachment not found: " + attachmentId));
        ResponseEntity<byte[]> filerResponse = seaweedFs.download(att.getSeaweedPath());
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"" + att.getFileName() + "\"")
                .header("Content-Type", att.getContentType())
                .body(filerResponse.getBody());
    }

    @Transactional
    public void delete(UUID attachmentId) {
        DevisAttachment att = attachmentRepo.findByTenantAndId(tid(), attachmentId)
                .orElseThrow(() -> new EntityNotFoundException("Attachment not found: " + attachmentId));
        seaweedFs.delete(att.getSeaweedPath());
        attachmentRepo.delete(att);
    }

    private AttachmentDto.Response toDto(DevisAttachment a) {
        return new AttachmentDto.Response(
                a.getId(), a.getEntityType(), a.getEntityId(),
                a.getFileName(), a.getContentType(), a.getFileSize(), a.getCreatedAt());
    }

    private static UUID tid() {
        return UUID.fromString(TenantContext.requireTenant());
    }

    private static UUID currentUserId() {
        try {
            Jwt jwt = (Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            String sub = jwt.getSubject();
            return sub != null ? UUID.fromString(sub) : null;
        } catch (Exception e) {
            return null;
        }
    }
}
