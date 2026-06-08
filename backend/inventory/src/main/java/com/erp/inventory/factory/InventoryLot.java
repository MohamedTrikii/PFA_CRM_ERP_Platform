package com.erp.inventory.factory;

import java.math.BigDecimal;
import java.util.UUID;

public class InventoryLot {
    private UUID productId;
    private int quantity;
    private BigDecimal unitCost;
    private String location;

    public InventoryLot() {}

    public InventoryLot(UUID productId, int quantity, BigDecimal unitCost, String location) {
        this.productId = productId;
        this.quantity = quantity;
        this.unitCost = unitCost;
        this.location = location;
    }

    public UUID getProductId() { return productId; }
    public void setProductId(UUID productId) { this.productId = productId; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public BigDecimal getUnitCost() { return unitCost; }
    public void setUnitCost(BigDecimal unitCost) { this.unitCost = unitCost; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
}
