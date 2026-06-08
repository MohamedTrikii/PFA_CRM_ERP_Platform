package com.erp.inventory.observer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class LowStockAlertObserver implements StockLevelObserver {

    private static final Logger log = LoggerFactory.getLogger(LowStockAlertObserver.class);
    private final int threshold = 5;

    @Override
    public void onStockLevelChanged(UUID productId, int newLevel) {
        if (newLevel <= threshold) {
            log.warn("Low stock alert for product {}: level={} (threshold={})", productId, newLevel, threshold);
        }
    }
}
