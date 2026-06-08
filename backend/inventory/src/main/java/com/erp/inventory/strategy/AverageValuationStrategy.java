package com.erp.inventory.strategy;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Component
public class AverageValuationStrategy implements StockValuationStrategy {

    @Override
    public BigDecimal value(int quantity, List<BigDecimal> inboundUnitCosts) {
        if (quantity <= 0 || inboundUnitCosts == null || inboundUnitCosts.isEmpty()) return BigDecimal.ZERO;
        BigDecimal sum = BigDecimal.ZERO;
        for (BigDecimal c : inboundUnitCosts) sum = sum.add(c);
        BigDecimal avg = sum.divide(BigDecimal.valueOf(inboundUnitCosts.size()), 6, RoundingMode.HALF_UP);
        return avg.multiply(BigDecimal.valueOf(quantity)).setScale(2, RoundingMode.HALF_UP);
    }
}
