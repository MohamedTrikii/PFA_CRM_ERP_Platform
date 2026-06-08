package com.erp.inventory.observer;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class StockLevelPublisher {

    private static final Logger log = LoggerFactory.getLogger(StockLevelPublisher.class);

    private final List<StockLevelObserver> observers = new CopyOnWriteArrayList<>();

    public void register(StockLevelObserver o) { observers.add(o); }
    public void unregister(StockLevelObserver o) { observers.remove(o); }

    public void publish(UUID productId, int newLevel) {
        for (StockLevelObserver o : observers) {
            try { o.onStockLevelChanged(productId, newLevel); } catch (Exception e) { log.warn("Observer threw during stock level publish", e); }
        }
    }
}
