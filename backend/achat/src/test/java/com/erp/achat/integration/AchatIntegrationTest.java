package com.erp.achat.integration;

import com.erp.achat.AchatApplication;
import com.erp.achat.repository.BonCommandeRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import com.erp.test.RequireDocker;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = AchatApplication.class)
@Testcontainers
@RequireDocker
@SuppressWarnings("resource")
class AchatIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("erp_test")
            .withUsername("erp")
            .withPassword("erp_test");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
        // disable oauth2 validation for integration test environment
        r.add("spring.autoconfigure.exclude",
            () -> "org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration");
        // disable Keycloak security bean during integration tests
        r.add("app.security.enabled", () -> "false");
        // disable Flyway migrations for the test DB to avoid requiring DB helper functions
        r.add("spring.flyway.enabled", () -> "false");
    }

    @Autowired
    BonCommandeRepository bonCommandeRepository;

    @Test
    void contextLoadsAndRepositoryAvailable() {
        assertThat(bonCommandeRepository).isNotNull();
    }
}
