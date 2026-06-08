package com.erp.inventory.strategy;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Component
public class FifoValuationStrategy implements StockValuationStrategy {

    @Override
    public BigDecimal value(int quantity, List<BigDecimal> inboundUnitCosts) {
        if (quantity <= 0 || inboundUnitCosts == null || inboundUnitCosts.isEmpty()) return BigDecimal.ZERO;
        BigDecimal total = BigDecimal.ZERO;
        int remaining = quantity;
        for (BigDecimal unitCost : inboundUnitCosts) {
            if (remaining <= 0) break;
            int take = 1; // conservative per-unit consumption; callers may pass expanded list representing each unit
            total = total.add(unitCost.multiply(BigDecimal.valueOf(take)));
            remaining -= take;
        }
        return total.setScale(2, RoundingMode.HALF_UP);
    }
}
