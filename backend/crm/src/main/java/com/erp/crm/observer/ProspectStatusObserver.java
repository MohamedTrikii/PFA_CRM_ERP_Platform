package com.erp.crm.observer;

import com.erp.crm.domain.Prospect;

public interface ProspectStatusObserver {
    void onStatusChanged(Prospect prospect);
}
