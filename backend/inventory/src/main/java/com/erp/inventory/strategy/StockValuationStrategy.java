package com.erp.inventory.strategy;

import java.math.BigDecimal;
import java.util.List;

public interface StockValuationStrategy {
    BigDecimal value(int quantity, List<BigDecimal> inboundUnitCosts);
}
