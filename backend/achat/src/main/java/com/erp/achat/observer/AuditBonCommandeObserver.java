package com.erp.achat.observer;

import com.erp.achat.domain.BonCommande;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class AuditBonCommandeObserver implements BonCommandeStatusObserver {

    private static final Logger log = LoggerFactory.getLogger(AuditBonCommandeObserver.class);

    @Override
    public void onStatusChanged(BonCommande bonCommande) {
        log.info("[AUDIT] BonCommande {} status -> {}", bonCommande.getReference(), bonCommande.getStatus());
    }
}
