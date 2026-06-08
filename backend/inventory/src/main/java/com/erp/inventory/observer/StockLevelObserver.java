package com.erp.inventory.observer;

import java.util.UUID;

public interface StockLevelObserver {
    void onStockLevelChanged(UUID productId, int newLevel);
}
