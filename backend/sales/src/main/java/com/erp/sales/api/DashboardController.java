package com.erp.sales.api;

import com.erp.sales.dto.DashboardDto;
import com.erp.sales.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sales/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/employer")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public DashboardDto.EmployerSummary employerSummary() {
        return dashboardService.employerSummary();
    }

    @GetMapping("/employee")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public DashboardDto.EmployeeSummary employeeSummary() {
        return dashboardService.employeeSummary();
    }

    @GetMapping("/client")
    @PreAuthorize("hasRole('CLIENT')")
    public DashboardDto.ClientSummary clientSummary(@AuthenticationPrincipal Jwt jwt) {
        UUID clientId   = UUID.fromString(jwt.getSubject());
        String email    = jwt.getClaimAsString("email");
        return dashboardService.clientSummary(clientId, email);
    }
}
