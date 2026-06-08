package com.erp.identity.api;

import com.erp.identity.repository.TenantRepository;
import com.erp.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/identity/platform")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class PlatformStatsController {

    private final TenantRepository tenantRepository;
    private final UserRepository   userRepository;

    @GetMapping("/stats")
    public PlatformStatsResponse stats() {
        long total  = tenantRepository.count();
        long active = tenantRepository.findAll().stream().filter(t -> t.isActive()).count();
        long users  = userRepository.count();
        return new PlatformStatsResponse(total, active, users);
    }

    @GetMapping("/tenants")
    public List<TenantUserCountResponse> tenantsWithUserCounts() {
        return tenantRepository.findAll().stream()
                .map(t -> new TenantUserCountResponse(
                        t.getId(), t.getName(), t.getSlug(),
                        t.isActive(), userRepository.countByTenantId(t.getId())))
                .toList();
    }

    public record PlatformStatsResponse(long totalTenants, long activeTenants, long totalUsers) {}
    public record TenantUserCountResponse(UUID id, String name, String slug, boolean active, long userCount) {}
}
