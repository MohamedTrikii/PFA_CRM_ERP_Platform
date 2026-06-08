package com.erp.achat.strategy;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class DefaultTvaCalculationStrategyTest {

    @Test
    void calculatesTvaCorrectly() {
        DefaultTvaCalculationStrategy strategy = new DefaultTvaCalculationStrategy();
        BigDecimal totalHt = new BigDecimal("100.00");
        BigDecimal rate = new BigDecimal("20");
        BigDecimal tva = strategy.calculateTva(totalHt, rate);
        assertEquals(new BigDecimal("20.00"), tva);
    }

    @Test
    void returnsZeroWhenNulls() {
        DefaultTvaCalculationStrategy strategy = new DefaultTvaCalculationStrategy();
        assertEquals(BigDecimal.ZERO, strategy.calculateTva(null, null));
    }
}
