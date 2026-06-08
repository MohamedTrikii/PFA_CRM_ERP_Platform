package com.erp.sales.observer;

import com.erp.sales.domain.Devis;
import com.erp.sales.domain.DevisStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Concrete Observer — déclenche des notifications métier lors de certaines transitions.
 * (ACCEPTE → notifie l'équipe commerciale ; REFUSE → alerte le responsable)
 */
@Component
@Slf4j
public class NotificationDevisObserver implements DevisStatusObserver {

    @Override
    public void onStatusChanged(Devis devis, DevisStatus previousStatus, DevisStatus newStatus) {
        switch (newStatus) {
            case ACCEPTE -> log.info("[NOTIF] Devis {} accepté — lancer création commande", devis.getReference());
            case REFUSE  -> log.warn("[NOTIF] Devis {} refusé — alerter commercial", devis.getReference());
            case EXPIRE  -> log.warn("[NOTIF] Devis {} expiré — relance client", devis.getReference());
            default      -> { /* pas d'action */ }
        }
    }
}
