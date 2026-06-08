package com.erp.crm.observer;

import com.erp.crm.domain.Prospect;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
@RequiredArgsConstructor
public class ProspectStatusPublisher {

    private static final Logger log = LoggerFactory.getLogger(ProspectStatusPublisher.class);

    private final List<ProspectStatusObserver> observers;

    public void publish(Prospect p) {
        if (observers == null || observers.isEmpty()) return;
        for (ProspectStatusObserver o : observers) {
            try {
                o.onStatusChanged(p);
            } catch (Exception e) { log.warn("Observer threw during prospect status publish", e); }
        }
    }
}
 
