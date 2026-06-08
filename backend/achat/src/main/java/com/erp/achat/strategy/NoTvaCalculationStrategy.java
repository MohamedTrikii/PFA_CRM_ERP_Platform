package com.erp.achat.strategy;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class NoTvaCalculationStrategy implements TvaCalculationStrategy {

    @Override
    public BigDecimal calculateTva(BigDecimal totalHt, BigDecimal tvaRate) {
        return BigDecimal.ZERO;
    }
}
