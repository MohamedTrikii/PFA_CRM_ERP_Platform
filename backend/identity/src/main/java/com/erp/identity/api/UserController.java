package com.erp.identity.api;

import com.erp.common.tenant.TenantContext;
import com.erp.identity.dto.UserDto;
import com.erp.identity.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/identity/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /** Employer or above can list users in their own tenant. */
    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public Page<UserDto.Response> list(@PageableDefault(size = 20) Pageable pageable) {
        return userService.findAll(pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public UserDto.Response getById(@PathVariable UUID id) {
        return userService.findById(id);
    }

    /** Only EMPLOYER or SUPER_ADMIN can create users. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public UserDto.Response create(@Valid @RequestBody UserDto.CreateRequest request,
                                   Authentication auth) {
        // SUPER_ADMIN can target any tenant; override the thread-local before the TX starts
        if (request.tenantId() != null && isSuperAdmin(auth)) {
            TenantContext.set(request.tenantId().toString());
        }
        return userService.create(request);
    }

    private static boolean isSuperAdmin(Authentication auth) {
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public UserDto.Response update(@PathVariable UUID id,
                                   @Valid @RequestBody UserDto.UpdateRequest request) {
        return userService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public void deactivate(@PathVariable UUID id) {
        userService.deactivate(id);
    }

    /** SUPER_ADMIN: resolve Keycloak subject IDs to display names (cross-tenant, for audit log). */
    @GetMapping("/by-keycloak")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public List<UserDto.Response> resolveByKeycloakIds(@RequestParam List<String> ids) {
        return userService.resolveActors(ids);
    }
}
