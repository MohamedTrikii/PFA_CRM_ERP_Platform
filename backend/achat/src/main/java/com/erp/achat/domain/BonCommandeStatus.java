package com.erp.achat.domain;

public enum BonCommandeStatus {
    BROUILLON, ENVOYE, PARTIELLEMENT_RECU, RECU, ANNULE;

    public boolean canTransitionTo(BonCommandeStatus next) {
        return switch (this) {
            case BROUILLON          -> next == ENVOYE   || next == ANNULE;
            case ENVOYE             -> next == PARTIELLEMENT_RECU || next == RECU || next == ANNULE;
            case PARTIELLEMENT_RECU -> next == RECU     || next == ANNULE;
            default                 -> false;
        };
    }
}
