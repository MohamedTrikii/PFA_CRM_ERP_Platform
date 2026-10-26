package com.erp.inventory.messaging;

import com.erp.common.event.LivraisonConfirmedEvent;
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
public class LivraisonEventHandler {

    private final StockService stockService;

    @RabbitListener(queues = "${queue.livraison-confirmed:inventory.livraison.confirmed}")
    public void handle(LivraisonConfirmedEvent event) {
        log.info("Received LivraisonConfirmedEvent livraisonId={} tenantId={}",
                event.livraisonId(), event.tenantId());

        TenantContext.set(event.tenantId().toString());
        try {
            for (LivraisonConfirmedEvent.Line line : event.lines()) {
                stockService.recordMovement(new com.erp.inventory.dto.StockDto.MovementCreate(
                    line.productId(), line.productReference(), null, MovementType.SORTIE,
                    line.quantityDelivered(), "LIVRAISON", event.livraisonId(),
                    "Auto from livraison " + event.livraisonId()
                ));
            }
        } finally {
            TenantContext.clear();
        }
    }
}
