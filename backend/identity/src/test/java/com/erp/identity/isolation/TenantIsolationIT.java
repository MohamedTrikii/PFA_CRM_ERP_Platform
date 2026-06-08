package com.erp.identity.isolation;

import com.erp.common.tenant.TenantContext;
import com.erp.identity.domain.Tenant;
import com.erp.identity.domain.User;
import com.erp.identity.domain.UserRole;
import com.erp.identity.repository.TenantRepository;
import com.erp.identity.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import com.erp.test.RequireDocker;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Proves that tenant isolation works at the application layer.
 *
 * Two tenants (A and B) each have one user.  Queries scoped to tenant A
 * must never return tenant B's data, and vice-versa.
 *
 * This test uses the real PostgreSQL container to also exercise the
 * TenantAwareDataSource / set_config path end-to-end.
 */
@SpringBootTest
@Testcontainers
@RequireDocker
class TenantIsolationIT {

    @Container
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("pgvector/pgvector:pg16")
            .withDatabaseName("erp_test")
            .withUsername("erp")
            .withPassword("erp_secret");

    @DynamicPropertySource
    static void overrideProps(DynamicPropertyRegistry reg) {
        reg.add("spring.datasource.url",      postgres::getJdbcUrl);
        reg.add("spring.datasource.username", postgres::getUsername);
        reg.add("spring.datasource.password", postgres::getPassword);
        // Skip OAuth2 auto-config – no Keycloak in unit tests
        reg.add("spring.security.oauth2.resourceserver.jwt.issuer-uri",
                () -> "http://localhost:9999/realms/test");
        reg.add("spring.autoconfigure.exclude",
                () -> "org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration");
    }

    @Autowired TenantRepository tenantRepository;
    @Autowired UserRepository   userRepository;

    private Tenant tenantA;
    private Tenant tenantB;
    private User   userA;
    private User   userB;

    @BeforeEach
    void setUp() {
        // Create two separate tenants (no RLS on tenants table)
        tenantA = tenantRepository.save(
            Tenant.builder().slug("tenant-alpha").name("Alpha Co.").build());
        tenantB = tenantRepository.save(
            Tenant.builder().slug("tenant-beta").name("Beta Co.").build());

        // Insert userA directly with tenantA's id (bypassing TenantContext for setup)
        userA = new User();
        userA.setTenantId(tenantA.getId());
        userA.setKeycloakId(UUID.randomUUID().toString());
        userA.setEmail("alice@alpha.com");
        userA.setDisplayName("Alice");
        userA.setRole(UserRole.EMPLOYEE);
        userRepository.save(userA);

        userB = new User();
        userB.setTenantId(tenantB.getId());
        userB.setKeycloakId(UUID.randomUUID().toString());
        userB.setEmail("bob@beta.com");
        userB.setDisplayName("Bob");
        userB.setRole(UserRole.EMPLOYEE);
        userRepository.save(userB);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
        userRepository.deleteAll();
        tenantRepository.deleteAll();
    }

    // ── Application-layer isolation (explicit tenant_id in queries) ──────────

    @Test
    @DisplayName("findAllByTenantId scoped to A returns only A's users")
    void queryAsA_returnsOnlyAUsers() {
        List<User> result = userRepository.findAllByTenantId(tenantA.getId());

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEmail()).isEqualTo("alice@alpha.com");
        assertThat(result).noneMatch(u -> u.getTenantId().equals(tenantB.getId()));
    }

    @Test
    @DisplayName("findAllByTenantId scoped to B returns only B's users")
    void queryAsB_returnsOnlyBUsers() {
        List<User> result = userRepository.findAllByTenantId(tenantB.getId());

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEmail()).isEqualTo("bob@beta.com");
        assertThat(result).noneMatch(u -> u.getTenantId().equals(tenantA.getId()));
    }

    @Test
    @DisplayName("findByIdAndTenantId with wrong tenant returns empty")
    void findByIdWrongTenant_returnsEmpty() {
        // Try to fetch userA using tenantB's ID — must not find it
        var result = userRepository.findByIdAndTenantId(userA.getId(), tenantB.getId());
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("findByIdAndTenantId with correct tenant returns the user")
    void findByIdCorrectTenant_returnsUser() {
        var result = userRepository.findByIdAndTenantId(userA.getId(), tenantA.getId());
        assertThat(result).isPresent();
        assertThat(result.get().getEmail()).isEqualTo("alice@alpha.com");
    }

    // ── TenantContext.requireTenant() guard ──────────────────────────────────

    @Test
    @DisplayName("requireTenant() throws when no tenant is in context")
    void requireTenant_throwsWhenEmpty() {
        TenantContext.clear();
        assertThatThrownBy(TenantContext::requireTenant)
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("No tenant in context");
    }

    @Test
    @DisplayName("requireTenant() returns tenant ID when set")
    void requireTenant_returnsValueWhenSet() {
        TenantContext.set(tenantA.getId().toString());
        assertThat(TenantContext.requireTenant()).isEqualTo(tenantA.getId().toString());
    }

    // ── TenantEntityListener auto-stamping ───────────────────────────────────

    @Test
    @DisplayName("TenantEntityListener auto-stamps tenant_id on persist from context")
    void entityListener_stampstenantId() {
        TenantContext.set(tenantA.getId().toString());

        User newUser = new User();
        newUser.setKeycloakId(UUID.randomUUID().toString());
        newUser.setEmail("carol@alpha.com");
        newUser.setDisplayName("Carol");
        newUser.setRole(UserRole.CLIENT);
        // Do NOT set tenantId — listener should fill it in

        User saved = userRepository.save(newUser);
        assertThat(saved.getTenantId()).isEqualTo(tenantA.getId());

        TenantContext.clear();
    }
}
