package com.erp.achat.observer;

import com.erp.achat.domain.BonCommande;

/**
 * Observer — réagit aux changements de statut d'un BonCommande.
 */
public interface BonCommandeStatusObserver {
    void onStatusChanged(BonCommande bonCommande);
}
