package com.erp.achat.observer;

import com.erp.achat.domain.BonCommande;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class BonCommandeStatusPublisher {

    private final List<BonCommandeStatusObserver> observers;

    public void publish(BonCommande bc) {
        if (observers == null || observers.isEmpty()) return;
        for (BonCommandeStatusObserver o : observers) {
            try {
                o.onStatusChanged(bc);
            } catch (Exception e) {
                // swallow observer exception to avoid disrupting main flow
            }
        }
    }
}
