package com.erp.cms.api;

import com.erp.cms.dto.CmsDto;
import com.erp.cms.service.NoticeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cms/notices")
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeService noticeService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public List<CmsDto.NoticeResponse> listAll() {
        return noticeService.listAll();
    }

    @GetMapping("/active")
    public List<CmsDto.NoticeResponse> listActive() {
        return noticeService.listActive();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public CmsDto.NoticeResponse create(@Valid @RequestBody CmsDto.NoticeCreateRequest req) {
        return noticeService.create(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public CmsDto.NoticeResponse update(
            @PathVariable UUID id,
            @Valid @RequestBody CmsDto.NoticeUpdateRequest req) {
        return noticeService.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public void delete(@PathVariable UUID id) {
        noticeService.delete(id);
    }
}
