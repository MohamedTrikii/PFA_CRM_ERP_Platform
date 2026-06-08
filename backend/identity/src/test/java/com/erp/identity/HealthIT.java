package com.erp.identity;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import com.erp.test.RequireDocker;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@RequireDocker
class HealthIT {

    @Container
    static PostgreSQLContainer<?> pg = new PostgreSQLContainer<>("pgvector/pgvector:pg16")
        .withDatabaseName("erp_db")
        .withUsername("erp")
        .withPassword("erp_secret");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", pg::getJdbcUrl);
        registry.add("spring.datasource.username", pg::getUsername);
        registry.add("spring.datasource.password", pg::getPassword);
        // disable oauth2 validation for unit test
        registry.add("spring.security.oauth2.resourceserver.jwt.issuer-uri",
            () -> "http://localhost:9999/realms/test");
        registry.add("spring.autoconfigure.exclude",
            () -> "org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration");
    }

    @LocalServerPort int port;
    @Autowired TestRestTemplate rest;

    @Test
    void healthEndpointIsUp() {
        var response = rest.getForEntity(
            "http://localhost:" + port + "/api/v1/identity/health", String.class);
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }
}
