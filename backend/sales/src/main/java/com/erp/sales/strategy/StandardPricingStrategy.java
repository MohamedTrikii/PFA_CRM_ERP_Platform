package com.erp.sales.strategy;

import com.erp.sales.domain.CatalogProduct;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Concrete Strategy — prix catalogue sans remise.
 */
@Component
public class StandardPricingStrategy implements PricingStrategy {

    @Override
    public BigDecimal calculateUnitPrice(CatalogProduct product, BigDecimal quantity) {
        return product.getUnitPrice();
    }

    @Override
    public String name() {
        return "STANDARD";
    }
}
