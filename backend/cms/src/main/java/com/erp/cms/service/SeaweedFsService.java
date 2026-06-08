package com.erp.cms.service;

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

@Slf4j
@Service
public class SeaweedFsService {

    @Value("${seaweedfs.filer.url:http://seaweed-filer:8888}")
    private String filerUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public String upload(UUID tenantId, String subfolder, MultipartFile file) throws IOException {
        String safe = file.getOriginalFilename() != null
                ? file.getOriginalFilename().replaceAll("[^a-zA-Z0-9._-]", "_")
                : "file";
        String path = String.format("/erp/%s/%s/%s_%s", tenantId, subfolder, UUID.randomUUID(), safe);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
            @Override public String getFilename() { return safe; }
        };
        body.add("file", new HttpEntity<>(resource, buildPartHeaders(file.getContentType(), safe)));

        restTemplate.exchange(filerUrl + path, HttpMethod.POST,
                new HttpEntity<>(body, headers), String.class);

        log.debug("Uploaded to SeaweedFS: {}", path);
        return path;
    }

    public byte[] download(String fid) {
        ResponseEntity<byte[]> resp = restTemplate.getForEntity(filerUrl + fid, byte[].class);
        return resp.getBody();
    }

    public void delete(String fid) {
        try {
            restTemplate.delete(filerUrl + fid);
        } catch (Exception e) {
            log.warn("Failed to delete from SeaweedFS: {}", fid, e);
        }
    }

    private HttpHeaders buildPartHeaders(String contentType, String filename) {
        HttpHeaders h = new HttpHeaders();
        if (contentType != null) h.setContentType(MediaType.parseMediaType(contentType));
        h.setContentDispositionFormData("file", filename);
        return h;
    }
}
