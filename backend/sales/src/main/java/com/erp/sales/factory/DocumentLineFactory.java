package com.erp.sales.factory;

import com.erp.sales.domain.*;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Factory — centralise la création des lignes de document (DevisLine)
 * depuis deux sources : catalogue produit ou saisie manuelle.
 */
@Component
public class DocumentLineFactory {

    public DevisLine fromCatalogProduct(Devis devis, CatalogProduct product,
                                        BigDecimal quantity, BigDecimal discountPct, short position) {
        Map<String, Object> snapshot = Map.of(
                "id",        product.getId().toString(),
                "reference", product.getReference(),
                "name",      product.getName(),
                "unitPrice", product.getUnitPrice().toPlainString(),
                "tvaRate",   product.getTvaRate().toPlainString(),
                "unit",      product.getUnit()
        );
        DevisLine line = new DevisLine();
        line.setDevis(devis);
        line.setProductId(product.getId());
        line.setProductSnapshot(snapshot);
        line.setDescription(product.getName());
        line.setQuantity(quantity);
        line.setUnitPrice(product.getUnitPrice());
        line.setTvaRate(product.getTvaRate());
        line.setDiscountPct(discountPct != null ? discountPct : BigDecimal.ZERO);
        line.setPosition(position);
        return line;
    }

    public DevisLine fromManualInput(Devis devis, String description,
                                     BigDecimal quantity, BigDecimal unitPrice,
                                     BigDecimal tvaRate, BigDecimal discountPct, short position) {
        Map<String, Object> snapshot = Map.of(
                "description", description,
                "unitPrice",   unitPrice.toPlainString()
        );
        DevisLine line = new DevisLine();
        line.setDevis(devis);
        line.setProductSnapshot(snapshot);
        line.setDescription(description);
        line.setQuantity(quantity);
        line.setUnitPrice(unitPrice);
        line.setTvaRate(tvaRate != null ? tvaRate : new BigDecimal("20.00"));
        line.setDiscountPct(discountPct != null ? discountPct : BigDecimal.ZERO);
        line.setPosition(position);
        return line;
    }
}
