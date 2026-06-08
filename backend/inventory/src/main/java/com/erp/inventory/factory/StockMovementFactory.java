package com.erp.inventory.factory;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

@Component
public class StockMovementFactory {

    public InventoryLot createInbound(UUID productId, int quantity, BigDecimal unitCost, String location) {
        return new InventoryLot(productId, quantity, unitCost, location);
    }

    public InventoryLot createOutbound(UUID productId, int quantity, String location) {
        return new InventoryLot(productId, -Math.abs(quantity), BigDecimal.ZERO, location);
    }
}
