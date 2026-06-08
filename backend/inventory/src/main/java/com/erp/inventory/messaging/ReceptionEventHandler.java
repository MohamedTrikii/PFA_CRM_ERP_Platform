package com.erp.inventory.messaging;

import com.erp.common.event.ReceptionConfirmedEvent;
import com.erp.common.tenant.TenantContext;
import com.erp.inventory.domain.MovementType;
import com.erp.inventory.service.StockService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReceptionEventHandler {

    private final StockService stockService;

    @RabbitListener(queues = "${queue.reception-confirmed:inventory.reception.confirmed}")
    public void handle(ReceptionConfirmedEvent event) {
        log.info("Received ReceptionConfirmedEvent bonReceptionId={} tenantId={}",
                event.bonReceptionId(), event.tenantId());

        TenantContext.set(event.tenantId());
        try {
            for (ReceptionConfirmedEvent.ReceptionLine line : event.lines()) {
                stockService.recordMovement(
                        line.productId(),
                        line.designation(),
                        line.locationId(),
                        MovementType.ENTREE,
                        line.quantiteRecue(),
                        "BON_RECEPTION",
                        event.bonReceptionId(),
                        "Auto from bon-reception " + event.bonReceptionId());
            }
        } finally {
            TenantContext.clear();
        }
    }
}
