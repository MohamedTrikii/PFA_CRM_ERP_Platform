package com.erp.sales.strategy;

import com.erp.sales.domain.CatalogProduct;

import java.math.BigDecimal;

/**
 * Strategy — contrat de calcul du prix unitaire appliqué à une ligne de Devis.
 */
public interface PricingStrategy {
    BigDecimal calculateUnitPrice(CatalogProduct product, BigDecimal quantity);
    String name();
}
