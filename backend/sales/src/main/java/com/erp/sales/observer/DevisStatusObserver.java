package com.erp.sales.observer;

import com.erp.sales.domain.Devis;
import com.erp.sales.domain.DevisStatus;

/**
 * Observer — contrat pour réagir aux changements de statut d'un Devis.
 */
public interface DevisStatusObserver {
    void onStatusChanged(Devis devis, DevisStatus previousStatus, DevisStatus newStatus);
}
