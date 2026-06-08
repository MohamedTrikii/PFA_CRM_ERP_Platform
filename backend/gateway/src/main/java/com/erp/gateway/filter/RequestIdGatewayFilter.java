package com.erp.gateway.filter;

import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.UUID;

/**
 * Ensures every request carries an X-Request-Id header.
 * If the client already sent one it is preserved; otherwise a new UUID is generated.
 * The same id is echoed back in the response so clients can correlate logs.
 */
@Component
public class RequestIdGatewayFilter implements GlobalFilter, Ordered {

    private static final String HEADER = "X-Request-Id";

    @Override
    public Mono<Void> filter(
            org.springframework.web.server.ServerWebExchange exchange,
            org.springframework.cloud.gateway.filter.GatewayFilterChain chain) {

        String requestId = exchange.getRequest().getHeaders().getFirst(HEADER);
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }

        final String rid = requestId;
        ServerHttpRequest mutated = exchange.getRequest().mutate()
                .header(HEADER, rid)
                .build();

        // Register header to be written before the response is committed to avoid
        // ReadOnlyHttpHeaders / UnsupportedOperationException when response already committed.
        exchange.getResponse().beforeCommit(() -> {
            exchange.getResponse().getHeaders().set(HEADER, rid);
            return Mono.empty();
        });

        return chain.filter(exchange.mutate().request(mutated).build());
    }

    @Override
    public int getOrder() { return Ordered.HIGHEST_PRECEDENCE + 1; }
}
