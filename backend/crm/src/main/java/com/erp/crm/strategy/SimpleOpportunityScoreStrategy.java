package com.erp.crm.strategy;

import com.erp.crm.domain.Prospect;
import org.springframework.stereotype.Component;

@Component
public class SimpleOpportunityScoreStrategy implements OpportunityScoreStrategy {

    @Override
    public int score(Prospect p) {
        int score = 0;
        if (p.getEmail() != null && !p.getEmail().isBlank()) score += 30;
        if (p.getPhone() != null && !p.getPhone().isBlank()) score += 30;
        if (p.getCompany() != null && !p.getCompany().isBlank()) score += 20;
        if (p.getNotes() != null && !p.getNotes().isBlank()) score += 20;
        return Math.min(score, 100);
    }
}
