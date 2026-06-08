package com.erp.sales.domain;

public enum DevisStatus {
    BROUILLON, ENVOYE, ACCEPTE, REFUSE, EXPIRE;

    public boolean canTransitionTo(DevisStatus next) {
        return switch (this) {
            case BROUILLON -> next == ENVOYE;
            case ENVOYE    -> next == ACCEPTE || next == REFUSE || next == EXPIRE;
            default        -> false;
        };
    }
}
