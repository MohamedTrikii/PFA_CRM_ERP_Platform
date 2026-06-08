package com.erp.gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
        return http
            .csrf(ServerHttpSecurity.CsrfSpec::disable)
            .authorizeExchange(ex -> ex
                .pathMatchers("/actuator/health", "/actuator/info").permitAll()
                .pathMatchers("/api/v1/public/**").permitAll()
                .pathMatchers("/api/v1/sales/requests/public").permitAll()
                .pathMatchers("/api/v1/ai/assistant-test").permitAll()  // Dev test endpoint
                .anyExchange().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> {}) // issuer-uri configured in application.yml
            )
            .build();
    }
}
