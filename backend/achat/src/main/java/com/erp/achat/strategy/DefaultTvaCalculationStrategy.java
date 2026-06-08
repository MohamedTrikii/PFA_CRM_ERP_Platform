package com.erp.achat.strategy;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
@Primary
public class DefaultTvaCalculationStrategy implements TvaCalculationStrategy {

    @Override
    public BigDecimal calculateTva(BigDecimal totalHt, BigDecimal tvaRate) {
        if (totalHt == null || tvaRate == null) return BigDecimal.ZERO;
        return totalHt.multiply(tvaRate)
            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }
}
