package com.erp.sales.domain;

public enum DevisRequestStatus {
    NOUVEAU,
    EN_ETUDE,
    DEVIS_CREE,
    REFUSE;

    public boolean canTransitionTo(DevisRequestStatus next) {
        return switch (this) {
            case NOUVEAU    -> next == EN_ETUDE || next == REFUSE;
            case EN_ETUDE   -> next == DEVIS_CREE || next == REFUSE;
            default         -> false;
        };
    }
}
