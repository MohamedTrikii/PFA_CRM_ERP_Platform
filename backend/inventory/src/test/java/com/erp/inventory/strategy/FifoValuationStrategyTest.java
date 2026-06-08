package com.erp.inventory.strategy;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.*;

class FifoValuationStrategyTest {

    @Test
    void values_fifo_correctly() {
        FifoValuationStrategy strategy = new FifoValuationStrategy();
        BigDecimal total = strategy.value(2, Arrays.asList(new BigDecimal("10.00"), new BigDecimal("20.00"), new BigDecimal("30.00")));
        assertEquals(new BigDecimal("30.00"), total);
    }

    @Test
    void returnsZeroForInvalidInput() {
        FifoValuationStrategy strategy = new FifoValuationStrategy();
        assertEquals(BigDecimal.ZERO, strategy.value(0, Arrays.asList(new BigDecimal("10.00"))));
    }
}
