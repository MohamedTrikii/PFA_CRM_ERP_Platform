package com.erp.achat.factory;

import com.erp.achat.domain.BonCommande;
import com.erp.achat.domain.BonCommandeLigne;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Factory — centralise la création des lignes de bon de commande achat.
 * Deux sources : produit catalogue (avec productId) ou saisie libre.
 */
@Component
public class BonCommandeLigneFactory {

    public BonCommandeLigne fromCatalog(BonCommande bonCommande, UUID productId,
                                        String designation, String reference,
                                        BigDecimal quantite, BigDecimal prixUnitaireHt,
                                        BigDecimal tvaRate, String unite, int position) {
        BigDecimal totalHt = quantite.multiply(prixUnitaireHt)
                                     .setScale(2, java.math.RoundingMode.HALF_UP);
        BonCommandeLigne ligne = new BonCommandeLigne();
        ligne.setBonCommande(bonCommande);
        ligne.setProductId(productId);
        ligne.setDesignation(designation);
        ligne.setReference(reference);
        ligne.setQuantite(quantite);
        ligne.setPrixUnitaireHt(prixUnitaireHt);
        ligne.setTvaRate(tvaRate);
        ligne.setTotalHt(totalHt);
        ligne.setUnite(unite != null ? unite : "unité");
        ligne.setPosition(position);
        return ligne;
    }

    public BonCommandeLigne fromManual(BonCommande bonCommande, String designation,
                                       BigDecimal quantite, BigDecimal prixUnitaireHt,
                                       BigDecimal tvaRate, int position) {
        BigDecimal totalHt = quantite.multiply(prixUnitaireHt)
                                     .setScale(2, java.math.RoundingMode.HALF_UP);
        BonCommandeLigne ligne = new BonCommandeLigne();
        ligne.setBonCommande(bonCommande);
        ligne.setDesignation(designation);
        ligne.setQuantite(quantite);
        ligne.setPrixUnitaireHt(prixUnitaireHt);
        ligne.setTvaRate(tvaRate != null ? tvaRate : BigDecimal.valueOf(20));
        ligne.setTotalHt(totalHt);
        ligne.setUnite("unité");
        ligne.setPosition(position);
        return ligne;
    }
}
