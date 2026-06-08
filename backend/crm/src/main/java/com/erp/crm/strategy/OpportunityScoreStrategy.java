package com.erp.crm.strategy;

import com.erp.crm.domain.Prospect;

public interface OpportunityScoreStrategy {
    int score(Prospect p);
}
