package com.erp.common.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Published by sales-service when a Livraison transitions to LIVREE.
 * Consumed by inventory-service to create StockMovement(SORTIE) entries.
 */
public record LivraisonConfirmedEvent(
        UUID eventId,
        UUID tenantId,
        UUID livraisonId,
        UUID commandeId,
        Instant occurredAt,
        List<Line> lines
) {
    public record Line(
            UUID productId,
            String productReference,
            BigDecimal quantityDelivered
    ) {}
}
