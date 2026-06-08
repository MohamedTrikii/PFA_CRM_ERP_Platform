package com.erp.identity.repository;

import com.erp.identity.domain.User;
import com.erp.identity.domain.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * All finder methods that return user data are scoped to tenantId explicitly.
 * This explicit filtering is the primary isolation layer; the Hibernate
 * "tenantFilter" (enabled by TenantFilterInterceptor) is the secondary layer.
 */
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<User> findByKeycloakId(String keycloakId);

    Optional<User> findByEmailAndTenantId(String email, UUID tenantId);

    Page<User> findAllByTenantId(UUID tenantId, Pageable pageable);

    List<User> findAllByTenantId(UUID tenantId);

    List<User> findAllByTenantIdAndRole(UUID tenantId, UserRole role);

    boolean existsByEmailAndTenantId(String email, UUID tenantId);

    long countByTenantId(UUID tenantId);

    /** Cross-tenant lookup by Keycloak subject IDs — SUPER_ADMIN only. No tenantId filter. */
    @Query("SELECT u FROM User u WHERE u.keycloakId IN :ids")
    List<User> findByKeycloakIdIn(@Param("ids") Collection<String> ids);
}
