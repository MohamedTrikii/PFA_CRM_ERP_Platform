package com.erp.sales.api;

import com.erp.sales.dto.AgingDto;
import com.erp.sales.service.FactureAgingService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/sales/factures/aging")
@RequiredArgsConstructor
public class FactureAgingController {

    private final FactureAgingService agingService;

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public AgingDto.AgingReport summary() {
        return agingService.summary();
    }

    @GetMapping("/detail")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public AgingDto.AgingDetail detail() {
        return agingService.detail();
    }
}
