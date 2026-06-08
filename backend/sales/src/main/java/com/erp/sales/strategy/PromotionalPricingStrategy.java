package com.erp.sales.strategy;

import com.erp.sales.domain.CatalogProduct;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Concrete Strategy — remise promotionnelle configurable (ex. 15 %).
 * Le taux est fourni à l'instanciation pour permettre des promotions variables.
 */
@Component
public class PromotionalPricingStrategy implements PricingStrategy {

    private final BigDecimal discountRate;

    public PromotionalPricingStrategy() {
        this.discountRate = new BigDecimal("0.15");
    }

    public PromotionalPricingStrategy(BigDecimal discountRate) {
        this.discountRate = discountRate;
    }

    @Override
    public BigDecimal calculateUnitPrice(CatalogProduct product, BigDecimal quantity) {
        return product.getUnitPrice()
                      .multiply(BigDecimal.ONE.subtract(discountRate))
                      .setScale(2, RoundingMode.HALF_UP);
    }

    @Override
    public String name() {
        return "PROMOTIONAL";
    }
}
