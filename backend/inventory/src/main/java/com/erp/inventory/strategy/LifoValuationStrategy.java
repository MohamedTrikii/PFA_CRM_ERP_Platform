package com.erp.inventory.strategy;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Component
public class LifoValuationStrategy implements StockValuationStrategy {

    @Override
    public BigDecimal value(int quantity, List<BigDecimal> inboundUnitCosts) {
        if (quantity <= 0 || inboundUnitCosts == null || inboundUnitCosts.isEmpty()) return BigDecimal.ZERO;
        BigDecimal total = BigDecimal.ZERO;
        int remaining = quantity;
        for (int i = inboundUnitCosts.size() - 1; i >= 0 && remaining > 0; i--) {
            BigDecimal unitCost = inboundUnitCosts.get(i);
            int take = 1;
            total = total.add(unitCost.multiply(BigDecimal.valueOf(take)));
            remaining -= take;
        }
        return total.setScale(2, RoundingMode.HALF_UP);
    }
}
