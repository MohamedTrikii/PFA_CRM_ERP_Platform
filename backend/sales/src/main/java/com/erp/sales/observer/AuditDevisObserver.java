package com.erp.sales.observer;

import com.erp.sales.domain.Devis;
import com.erp.sales.domain.DevisStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Concrete Observer — enregistre chaque transition de statut dans les logs d'audit.
 */
@Component
@Slf4j
public class AuditDevisObserver implements DevisStatusObserver {

    @Override
    public void onStatusChanged(Devis devis, DevisStatus previousStatus, DevisStatus newStatus) {
        log.info("[AUDIT] Devis {} | {} → {} | client={}",
                devis.getReference(), previousStatus, newStatus, devis.getClientId());
    }
}
