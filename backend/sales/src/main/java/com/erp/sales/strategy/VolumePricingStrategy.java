package com.erp.sales.strategy;

import com.erp.sales.domain.CatalogProduct;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Concrete Strategy — remise volume de 5 % pour quantité ≥ 10.
 */
@Component
public class VolumePricingStrategy implements PricingStrategy {

    private static final BigDecimal DISCOUNT_RATE = new BigDecimal("0.05");
    private static final BigDecimal THRESHOLD      = new BigDecimal("10");

    @Override
    public BigDecimal calculateUnitPrice(CatalogProduct product, BigDecimal quantity) {
        if (quantity.compareTo(THRESHOLD) >= 0) {
            return product.getUnitPrice()
                          .multiply(BigDecimal.ONE.subtract(DISCOUNT_RATE))
                          .setScale(2, RoundingMode.HALF_UP);
        }
        return product.getUnitPrice();
    }

    @Override
    public String name() {
        return "VOLUME";
    }
}
