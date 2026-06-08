package com.erp.crm.observer;

import com.erp.crm.domain.Prospect;
import com.erp.crm.strategy.OpportunityScoreStrategy;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OpportunityScoringObserver implements ProspectStatusObserver {

    private static final Logger log = LoggerFactory.getLogger(OpportunityScoringObserver.class);

    private final OpportunityScoreStrategy scoreStrategy;

    @Override
    public void onStatusChanged(Prospect prospect) {
        int score = scoreStrategy.score(prospect);
        log.info("Prospect {} scored {} by OpportunityScoringObserver", prospect.getName(), score);
    }
}
