package com.erp.common.event;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ReceptionConfirmedEvent(
        String tenantId,
        UUID bonReceptionId,
        UUID bonCommandeId,
        List<ReceptionLine> lines
) {
    public record ReceptionLine(
            UUID productId,
            String designation,
            BigDecimal quantiteRecue,
            UUID locationId
    ) {}
}
