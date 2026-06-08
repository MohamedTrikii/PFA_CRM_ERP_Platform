package com.erp.sales.strategy;

import com.erp.sales.domain.CatalogProduct;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Context (Strategy) — encapsule la stratégie de tarification active.
 * Permet de changer dynamiquement la stratégie selon le type de client ou de commande.
 */
@Component
public class PricingContext {

    private PricingStrategy strategy;

    public PricingContext(StandardPricingStrategy defaultStrategy) {
        this.strategy = defaultStrategy;
    }

    public void setStrategy(PricingStrategy strategy) {
        this.strategy = strategy;
    }

    public String activeStrategy() {
        return strategy.name();
    }

    public BigDecimal applyPricing(CatalogProduct product, BigDecimal quantity) {
        return strategy.calculateUnitPrice(product, quantity);
    }
}
