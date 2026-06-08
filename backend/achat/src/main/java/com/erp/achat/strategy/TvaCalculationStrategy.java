package com.erp.achat.strategy;

import java.math.BigDecimal;

public interface TvaCalculationStrategy {
    BigDecimal calculateTva(BigDecimal totalHt, BigDecimal tvaRate);
}
