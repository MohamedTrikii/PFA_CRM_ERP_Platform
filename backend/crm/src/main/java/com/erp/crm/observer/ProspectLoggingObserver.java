package com.erp.crm.observer;

import com.erp.crm.domain.Prospect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class ProspectLoggingObserver implements ProspectStatusObserver {

    private static final Logger log = LoggerFactory.getLogger(ProspectLoggingObserver.class);

    @Override
    public void onStatusChanged(Prospect prospect) {
        log.info("Prospect {} status changed → {}", prospect.getName(), prospect.getStatus());
    }
}
