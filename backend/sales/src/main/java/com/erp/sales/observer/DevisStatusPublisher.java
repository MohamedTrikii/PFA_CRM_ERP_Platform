package com.erp.sales.observer;

import com.erp.sales.domain.Devis;
import com.erp.sales.domain.DevisStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Subject (Observer) — notifie tous les observers enregistrés
 * lors d'un changement de statut d'un Devis.
 * Spring injecte automatiquement toutes les implémentations de DevisStatusObserver.
 */
@Component
@RequiredArgsConstructor
public class DevisStatusPublisher {

    private final List<DevisStatusObserver> observers;

    public void publish(Devis devis, DevisStatus previousStatus, DevisStatus newStatus) {
        observers.forEach(o -> o.onStatusChanged(devis, previousStatus, newStatus));
    }
}
