package com.erp.identity.service;

import com.erp.common.audit.AuditAction;
import com.erp.common.audit.Auditable;
import com.erp.common.tenant.TenantContext;
import com.erp.identity.domain.User;
import com.erp.identity.dto.UserDto;
import com.erp.identity.mapper.UserMapper;
import com.erp.identity.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import com.erp.identity.observer.UserLifecyclePublisher;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final UserMapper     userMapper;
    private final UserLifecyclePublisher userLifecyclePublisher;

    public Page<UserDto.Response> findAll(Pageable pageable) {
        UUID tenantId = UUID.fromString(TenantContext.requireTenant());
        return userRepository.findAllByTenantId(tenantId, pageable)
                             .map(userMapper::toResponse);
    }

    public UserDto.Response findById(UUID id) {
        UUID tenantId = UUID.fromString(TenantContext.requireTenant());
        return userMapper.toResponse(getOrThrow(id, tenantId));
    }

    /** Called on first login — upserts the user record from Keycloak JWT claims. */
    @Transactional
    @Auditable(action = AuditAction.LOGIN, entityType = "User")
    public UserDto.Response upsertFromToken(String keycloakId, String email,
                                            String displayName, UUID tenantId,
                                            com.erp.identity.domain.UserRole role) {
        return userRepository.findByKeycloakId(keycloakId)
            .map(existing -> {
                existing.setEmail(email);
                existing.setDisplayName(displayName);
                return userMapper.toResponse(userRepository.save(existing));
            })
            .orElseGet(() -> {
                User user = User.builder()
                    .keycloakId(keycloakId)
                    .email(email)
                    .displayName(displayName)
                    .role(role)
                    .build();
                user.setTenantId(tenantId);
                return userMapper.toResponse(userRepository.save(user));
            });
    }

    @Transactional
    @Auditable(action = AuditAction.CREATE, entityType = "User")
    public UserDto.Response create(UserDto.CreateRequest request) {
        UUID tenantId = UUID.fromString(TenantContext.requireTenant());
        if (userRepository.existsByEmailAndTenantId(request.email(), tenantId)) {
            throw new IllegalArgumentException("Email already exists in this tenant");
        }
        User user = userMapper.toEntity(request);
        // TenantEntityListener will stamp tenantId from TenantContext,
        // but we also set it explicitly for clarity.
        user.setTenantId(tenantId);
        User saved = userRepository.save(user);
        try { userLifecyclePublisher.publishCreated(saved); } catch (Exception e) { log.warn("Failed publishing user created", e); }
        return userMapper.toResponse(saved);
    }

    @Transactional
    @Auditable(action = AuditAction.UPDATE, entityType = "User")
    public UserDto.Response update(UUID id, UserDto.UpdateRequest request) {
        UUID tenantId = UUID.fromString(TenantContext.requireTenant());
        User user = getOrThrow(id, tenantId);
        userMapper.updateEntity(request, user);
        return userMapper.toResponse(userRepository.save(user));
    }

    @Transactional
    @Auditable(action = AuditAction.DELETE, entityType = "User")
    public void deactivate(UUID id) {
        UUID tenantId = UUID.fromString(TenantContext.requireTenant());
        User user = getOrThrow(id, tenantId);
        user.setActive(false);
        User saved = userRepository.save(user);
        try { userLifecyclePublisher.publishDeactivated(saved); } catch (Exception e) { log.warn("Failed publishing user deactivated", e); }
    }

    /** SUPER_ADMIN: resolve Keycloak subject IDs to user display info (cross-tenant). */
    public List<UserDto.Response> resolveActors(Collection<String> keycloakIds) {
        return userRepository.findByKeycloakIdIn(keycloakIds).stream()
                .map(userMapper::toResponse).toList();
    }

    private User getOrThrow(UUID id, UUID tenantId) {
        return userRepository.findByIdAndTenantId(id, tenantId)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
    }
}
