package com.erp.sales.api;

import com.erp.sales.dto.AttachmentDto;
import com.erp.sales.service.AttachmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sales/attachments")
@RequiredArgsConstructor
public class AttachmentController {

    private final AttachmentService service;

    @GetMapping("/{entityType}/{entityId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE','CLIENT')")
    public List<AttachmentDto.Response> list(@PathVariable String entityType,
                                              @PathVariable UUID entityId) {
        return service.findByEntity(entityType.toUpperCase(), entityId);
    }

    @PostMapping("/{entityType}/{entityId}")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE','CLIENT')")
    public AttachmentDto.Response upload(@PathVariable String entityType,
                                          @PathVariable UUID entityId,
                                          @RequestParam("file") MultipartFile file) throws IOException {
        return service.upload(entityType.toUpperCase(), entityId, file);
    }

    @GetMapping("/{id}/download")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE','CLIENT')")
    public ResponseEntity<byte[]> download(@PathVariable UUID id) {
        return service.download(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
