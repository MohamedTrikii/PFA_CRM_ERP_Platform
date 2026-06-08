package com.erp.sales.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

/**
 * Stores and retrieves files via SeaweedFS Filer HTTP API.
 *
 * Upload:   POST  http://filer:8888/{path}    with multipart body
 * Download: GET   http://filer:8888/{path}
 * Delete:   DELETE http://filer:8888/{path}
 *
 * Files are organised as /erp/{tenantId}/attachments/{uuid}_{filename}
 * so each tenant's files are isolated at the path level.
 */
@Slf4j
@Service
public class SeaweedFsService {

    @Value("${seaweedfs.filer.url:http://seaweed-filer:8888}")
    private String filerUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Uploads a file to SeaweedFS and returns the filer path.
     */
    public String upload(UUID tenantId, MultipartFile file) throws IOException {
        String safeFilename = file.getOriginalFilename() != null
                ? file.getOriginalFilename().replaceAll("[^a-zA-Z0-9._-]", "_")
                : "file";
        String path = "/erp/" + tenantId + "/attachments/" + UUID.randomUUID() + "_" + safeFilename;
        String url = filerUrl + path;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
            @Override public String getFilename() { return safeFilename; }
        };
        body.add("file", new HttpEntity<>(resource, buildPartHeaders(file.getContentType())));

        HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
        restTemplate.postForEntity(url, request, String.class);

        log.info("Uploaded {} → SeaweedFS path {}", safeFilename, path);
        return path;
    }

    /**
     * Downloads a file from SeaweedFS. Returns raw bytes.
     */
    public ResponseEntity<byte[]> download(String seaweedPath) {
        String url = filerUrl + seaweedPath;
        return restTemplate.getForEntity(url, byte[].class);
    }

    /**
     * Deletes a file from SeaweedFS.
     */
    public void delete(String seaweedPath) {
        try {
            restTemplate.delete(filerUrl + seaweedPath);
            log.info("Deleted SeaweedFS path {}", seaweedPath);
        } catch (Exception e) {
            log.warn("Failed to delete SeaweedFS path {}: {}", seaweedPath, e.getMessage());
        }
    }

    private HttpHeaders buildPartHeaders(String contentType) {
        HttpHeaders h = new HttpHeaders();
        if (contentType != null) {
            h.setContentType(MediaType.parseMediaType(contentType));
        }
        return h;
    }
}
